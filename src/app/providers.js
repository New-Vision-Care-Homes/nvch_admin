"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import AuthProvider from "@/context/AuthProvider";

export default function Providers({ children }) {
	const [queryClient] = useState(
		() =>
		new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: 5 * 60 * 1000,
					cacheTime: 30 * 60 * 1000, 
					refetchOnWindowFocus: false,
					// Retry once, but never on 4xx — those are deterministic
					// (permissions, validation, not-found) and retrying just
					// duplicates the failed request.
					retry: (failureCount, error) => {
						const status = error?.response?.status;
						if (status >= 400 && status < 500) return false;
						return failureCount < 1;
					},
				},
			},
		})
	);

	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				{children}
			</AuthProvider>
		</QueryClientProvider>
	);
}
