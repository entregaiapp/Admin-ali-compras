export type LoginUserType = "tenant" | "driver";

export type LoginCredentials = {
  email: string;
  password: string;
  userType: LoginUserType;
};

export type AuthUser = {
  id: string;
  loja_id?: string | null;
  nome?: string;
  email?: string;
  perfil?: string;
  role?: string;
  status?: string;
  entregador_id?: string | null;
  cliente_id?: string | null;
  cpf?: string | null;
  cpf_na_nota_padrao?: boolean;
  exigir_mfa_login?: boolean;
  user_type?: string;
  permissions?: string[];
};

export type LoginResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user?: AuthUser;
  mfa_required?: boolean;
  mfa_enrollment_required?: boolean;
  mfa_challenge_required?: boolean;
  aal?: "aal1" | "aal2";
};

export type MfaFactor = {
  id: string;
  friendly_name?: string;
  created_at?: string;
};

export type MfaStatus = {
  required: boolean;
  login_required: boolean;
  refund_required: boolean;
  aal: "aal1" | "aal2";
  enrollment_required: boolean;
  challenge_required: boolean;
  factors: MfaFactor[];
};

export type ForgotPasswordResponse = {
  message: string;
  reset_url?: string;
  reset_token?: string;
};
