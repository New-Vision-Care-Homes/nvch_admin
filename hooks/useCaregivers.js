import { useQuery } from "@tanstack/react-query";
export const useCaregivers = () => {
    return useQuery({
        queryKey: ["caregivers"],
        queryFn: async () => {
            const token = localStorage.getItem("token");
            const res = await fetch(
                "https://nvch-server.onrender.com/api/auth/admin/caregivers",
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            return data.data.caregivers || [];
        },
        staleTime: 1000 * 60 * 10,
    });
};