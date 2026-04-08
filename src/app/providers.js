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
					retry: 1,
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
