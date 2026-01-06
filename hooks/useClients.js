import { useQuery } from "@tanstack/react-query";

export const useClients = () => {
    return useQuery({
        queryKey: ["clients"],
        queryFn: async () => {
            const token = localStorage.getItem("token");
            const res = await fetch("https://nvch-server.onrender.com/api/auth/admin/clients", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch clients");
            const result = await res.json();
            return result.data.clients || [];
        },
    });
};