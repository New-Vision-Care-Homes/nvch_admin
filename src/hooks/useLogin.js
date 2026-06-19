import { authService } from '@/services/api/services/authService';
import { notificationService } from '@/services/api/services/notificationService';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from 'next/navigation';

const getErrorMessage = (err) => {
	return (
		err?.response?.data?.message ||
		err?.response?.data?.details?.[0]?.msg ||
		err?.response?.data?.error ||
		err?.message ||
		"An unexpected error occurred"
	);
};

export const useLogin = () => {
	const router = useRouter();
	const queryClient = useQueryClient();

	const loginMutation = useMutation({
		// Both login + stream-token run here so isPending covers the full sequence.
		mutationFn: async ({ email, password }) => {
			const loginData = await authService.userLogin(email, password);
			const token = loginData?.token;
			if (token) {
				// JWT must be in sessionStorage before getStreamToken fires (axios interceptor reads it).
				sessionStorage.setItem("token", token);
				try {
					const { streamToken, expiresIn } = await notificationService.getStreamToken();
					sessionStorage.setItem("sseStreamToken", streamToken);
					sessionStorage.setItem("sseStreamTokenExpiry", String(Date.now() + expiresIn * 1000));
					sessionStorage.removeItem("sseUnavailable");
				} catch {
					// Non-fatal — user still gets in; bell will show degraded state.
					sessionStorage.setItem("sseUnavailable", "true");
				}
			}
			return loginData;
		},
		onSuccess: (data) => {
			if (data?.token) {
				queryClient.clear(); // wipe any cached data from a previous session
				router.push("/dashboard");
			}
		},
		onError: (error) => {
			console.error("Login failed:", error);
		}
	});

	return {
		loginCheck: loginMutation.mutate,
		isLoginPending: loginMutation.isPending,
		loginErrorMessage: getErrorMessage(loginMutation.error),
		isLoginError: loginMutation.isError,
	}
};

export const useForgotPassword = () => {
	const requestMutation = useMutation({
		mutationFn: (email) => authService.forgotPassword(email),
	});

	const resetMutation = useMutation({
		mutationFn: ({ email, otp, password }) => authService.resetPassword({ email, otp, password }),
	});

	return {
		sendCode: requestMutation.mutate,
		isSendPending: requestMutation.isPending,
		sendError: getErrorMessage(requestMutation.error),
		isSendError: requestMutation.isError,

		submitReset: resetMutation.mutate,
		isResetPending: resetMutation.isPending,
		resetError: getErrorMessage(resetMutation.error),
		isResetError: resetMutation.isError,
		isResetSuccess: resetMutation.isSuccess,
	};
};
