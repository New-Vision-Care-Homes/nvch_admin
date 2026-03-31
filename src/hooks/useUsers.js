import { useQuery } from "@tanstack/react-query";

export const useUser = (userId) => {
	return useQuery({
		queryKey: ["user", userId],
		enabled: !!userId,
		queryFn: async () => {
			const token = localStorage.getItem("token");

			const res = await fetch(
				`https://nvch-server.onrender.com/api/auth/admin/users/${userId}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);

			if (!res.ok) {
				throw new Error("Failed to fetch user");
			}

			return res.json();
		},
	});
};
