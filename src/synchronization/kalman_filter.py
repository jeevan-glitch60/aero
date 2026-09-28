"""Continuous-Discrete Extended Kalman Filter (EKF) for Digital Twin Synchronization."""

import numpy as np
from typing import Dict, Any, Tuple
from src.core.types import SensorFrame, TwinThermodynamicState, InnovationResiduals


class EngineExtendedKalmanFilter:
    """Synchronizes Virtual Twin state with real-time avionics telemetry using EKF."""

    def __init__(self):
        # State vector dimension n=8:
        # [P_man (hPa), T_man (C), CHT1 (C), CHT2 (C), CHT3 (C), CHT4 (C), T_oil (C), eta_comb_scale]
        self.n_states = 8
        self.n_meas = 8

        # State estimate vector x_hat
        self.x_hat = np.array([1013.25, 25.0, 90.0, 90.0, 90.0, 90.0, 85.0, 1.0], dtype=np.float64)

        # State Error Covariance matrix P
        self.P = np.diag([25.0, 4.0, 9.0, 9.0, 9.0, 9.0, 4.0, 0.01]).astype(np.float64)

        # Process Noise Covariance Q
        self.Q = np.diag([4.0, 0.5, 0.8, 0.8, 0.8, 0.8, 0.4, 0.0001]).astype(np.float64)

        # Measurement Noise Covariance R
        self.R = np.diag([9.0, 1.0, 2.25, 2.25, 2.25, 2.25, 1.0, 0.25]).astype(np.float64)

        # Measurement matrix H
        self.H = np.zeros((self.n_meas, self.n_states), dtype=np.float64)
        for i in range(7):
            self.H[i, i] = 1.0
        # Meas 7 is fuel flow, correlated with state 7 (eta_comb_scale) and state 0 (P_man)
        self.H[7, 0] = 0.015
        self.H[7, 7] = 15.0

        self.last_timestamp: float = 0.0

    def update(
        self,
        sensor: SensorFrame,
        twin_prediction: TwinThermodynamicState,
    ) -> Tuple[np.ndarray, InnovationResiduals]:
        """Performs EKF Predict and Correct steps and computes Innovation Residuals."""
        dt = sensor.timestamp - self.last_timestamp if self.last_timestamp > 0 else 0.02
        dt = max(0.005, min(0.5, dt))
        self.last_timestamp = sensor.timestamp

        # 1. Measurement vector y from live sensors
        # [P_man, T_man, CHT1, CHT2, CHT3, CHT4, T_oil, Fuel_Flow]
        y_meas = np.array([
            sensor.map_hpa,
            sensor.mat_c,
            sensor.cht_c[0],
            sensor.cht_c[1],
            sensor.cht_c[2],
            sensor.cht_c[3],
            sensor.oil_temp_c,
            sensor.fuel_flow_lph,
        ], dtype=np.float64)

        # 2. Physics Model Predicted State (Prior x_hat_minus)
        x_pred = np.array([
            twin_prediction.map_predicted_hpa,
            twin_prediction.mat_predicted_c,
            twin_prediction.cht_predicted_c[0],
            twin_prediction.cht_predicted_c[1],
            twin_prediction.cht_predicted_c[2],
            twin_prediction.cht_predicted_c[3],
            twin_prediction.oil_temp_predicted_c,
            self.x_hat[7],  # parameter persistent
        ], dtype=np.float64)

        # 3. State transition Jacobian F (linearized around nominal operating point)
        F = np.eye(self.n_states, dtype=np.float64)
        F[2, 0] = 0.01 * dt
        F[3, 0] = 0.01 * dt
        F[4, 0] = 0.01 * dt
        F[5, 0] = 0.01 * dt
        F[6, 0] = 0.005 * dt

        # Predict Covariance P_minus = F * P * F^T + Q
        P_minus = F @ self.P @ F.T + self.Q * dt

        # 4. Innovation Residuals: r = y_meas - H * x_pred
        y_pred = self.H @ x_pred
        y_pred[7] = twin_prediction.fuel_mass_flow_g_per_s * (3.6 / 0.74)  # convert g/s to lph

        residual = y_meas - y_pred

        # 5. Innovation Covariance S = H * P_minus * H^T + R
        S = self.H @ P_minus @ self.H.T + self.R
        S_inv = np.linalg.inv(S)

        # 6. Kalman Gain K = P_minus * H^T * S_inv
        K = P_minus @ self.H.T @ S_inv

        # 7. State Update (Posterior)
        self.x_hat = x_pred + K @ residual
        self.P = (np.eye(self.n_states) - K @ self.H) @ P_minus

        # 8. Mahalanobis Distance on Innovation Vector
        # D_M = sqrt(r^T * S_inv * r)
        mahalanobis_sq = float(residual.T @ S_inv @ residual)
        mahalanobis_dist = float(np.sqrt(max(0.0, mahalanobis_sq)))

        # Normalize Anomaly score: normal Chi-Square 8 DOF 95% quantile is ~15.5
        anomaly_score_pct = min(100.0, max(0.0, (mahalanobis_dist / 4.0) ** 2 * 18.0))
        is_anomaly = mahalanobis_dist > 3.2

        residuals_packet = InnovationResiduals(
            timestamp=round(sensor.timestamp, 3),
            residual_map_hpa=round(float(residual[0]), 2),
            residual_mat_c=round(float(residual[1]), 2),
            residual_egt_c=[
                round(sensor.egt_c[i] - twin_prediction.egt_predicted_c[i], 2)
                for i in range(4)
            ],
            residual_cht_c=[round(float(residual[2 + i]), 2) for i in range(4)],
            residual_oil_temp_c=round(float(residual[6]), 2),
            residual_oil_press_bar=round(sensor.oil_press_bar - twin_prediction.oil_press_predicted_bar, 2),
            residual_fuel_flow_lph=round(float(residual[7]), 2),
            mahalanobis_distance=round(mahalanobis_dist, 2),
            anomaly_score_pct=round(anomaly_score_pct, 1),
            is_anomaly=is_anomaly,
        )

        return self.x_hat, residuals_packet
