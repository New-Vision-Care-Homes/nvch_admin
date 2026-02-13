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

/*
// hooks/useShifts.js
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const BASE_URL = "https://nvch-server.onrender.com";

export const useShifts = (filters = {}) => {
    return useQuery({
        queryKey: ["shifts", filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.startDate) params.append("startDate", filters.startDate);
            if (filters.endDate) params.append("endDate", filters.endDate);
            if (filters.status) params.append("status", filters.status);
            
			const token = localStorage.getItem("token"); 

			const { data } = await axios.get(`${BASE_URL}/api/shifts`, {
                params: filters, 
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return data.data.shifts;
        },

        keepPreviousData: true, 
    });
};*/

export const useShift = (caregiverId) => {
	return useQuery({
		queryKey: ["user", caregiverId],
		enabled: !!caregiverId,
		queryFn: async () => {
            const token = localStorage.getItem("token");
            const res = await fetch(`https://nvch-server.onrender.com/api/shifts?caregiverId=${caregiverId}`, {
                headers: { Authorization: `Bearer ${token}`},
            });
            if (!res.ok) throw new Error("Failed to fetch shifts");
            const result = await res.json();
            return result.data.shifts || [];
		},
	});
};