import { authService } from '@/services/api/services/authService';
import { useMutation } from "@tanstack/react-query";
import { useRouter } from 'next/navigation';

/**
 * Extract the most relevant human-readable error message from an axios error.
 */
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
