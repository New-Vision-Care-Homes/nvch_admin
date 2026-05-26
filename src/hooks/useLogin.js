import { authService } from '@/services/api/services/authService';
import { useMutation } from "@tanstack/react-query";
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

	const loginMutation = useMutation({
		mutationFn: ({ email, password }) => authService.userLogin(email, password),
		onSuccess: (data) => {
			const token = data?.token;
			if (token) {
				sessionStorage.setItem("token", token);
			}
			console.log(token);
			router.push("/dashboard");
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
