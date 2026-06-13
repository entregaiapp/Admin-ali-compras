import api from "@/shared/lib/api";
import type { ForgotPasswordResponse, LoginCredentials, LoginResponse, MfaStatus } from "../types/auth";

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await api.post<LoginResponse>("/auth/login", credentials);
    return response.data;
  },

  async forgotPassword(email: string) {
    const response = await api.post<ForgotPasswordResponse>("/auth/forgot-password", {
      email,
      userType: "tenant",
      redirectUrl: `${window.location.origin}/reset-password`,
    });

    return response.data;
  },

  async resetPassword(accessToken: string, refreshToken: string | undefined, password: string) {
    const response = await api.post<{ message: string }>("/auth/reset-password", {
      access_token: accessToken,
      refresh_token: refreshToken,
      password,
    });

    return response.data;
  },

  persistSession(data: LoginResponse) {
    localStorage.setItem("token", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("refresh_token", data.refresh_token);
    } else {
      localStorage.removeItem("refresh_token");
    }

    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data.user;
  },

  async getMfaStatus() {
    const response = await api.get<MfaStatus>("/auth/mfa/status");
    return response.data;
  },

  async updateMfaPreferences(preferences: { login_required?: boolean; refund_required?: boolean }) {
    const response = await api.patch<MfaStatus>("/auth/mfa/preferences", preferences);
    return response.data;
  },

  async enrollMfa() {
    const response = await api.post<{ id: string; totp: { qr_code: string; secret: string } }>("/auth/mfa/enroll");
    return response.data;
  },

  async challengeMfa(factorId: string) {
    const response = await api.post<{ id: string }>("/auth/mfa/challenge", { factor_id: factorId });
    return response.data;
  },

  async verifyMfa(factorId: string, challengeId: string, code: string) {
    const response = await api.post<LoginResponse>("/auth/mfa/verify", {
      factor_id: factorId,
      challenge_id: challengeId,
      code,
    });
    return response.data;
  },
};
