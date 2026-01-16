import { useQuery } from "@tanstack/react-query";

export const useShifts = () => {
    return useQuery({
        queryKey: ["shifts"],
        queryFn: async () => {
            const token = localStorage.getItem("token");
            const res = await fetch("https://nvch-server.onrender.com/api/shifts", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch shifts");
            const result = await res.json();
            return result.data.shifts || [];
        },
    });
};

export const useShift = (caregiverId) => {
	return useQuery({
		queryKey: ["user", caregiverId],
		enabled: !!caregiverId,
		queryFn: async () => {
            const token = localStorage.getItem("token");
            const res = await fetch(`https://nvch-server.onrender.com/api/shifts?caregiverId=${caregiverId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch shifts");
            const result = await res.json();
            return result.data.shifts || [];
		},
	});
};