// delete

import { useQuery } from "@tanstack/react-query";

const S3_API_BASE_URL = "https://nvch-server.onrender.com/api/upload";
const DEFAULT_AVATAR = "/img/navbar/avatar.jpg";

export const useImageUrl = (fileKey) => {
	const shouldFetch =
		!!fileKey && typeof fileKey === "string" && !fileKey.startsWith("/img");

	const query = useQuery({
		queryKey: ["signedImage", fileKey],
		enabled: shouldFetch,
		queryFn: async () => {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${S3_API_BASE_URL}/file-url?fileKey=${encodeURIComponent(fileKey)}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			if (!res.ok) throw new Error("Failed to fetch signed image URL");
			return res.json();
		},
		staleTime: 1000 * 60 * 30,
	});

	return {
		...query,
		imageUrl: shouldFetch ? query.data : DEFAULT_AVATAR,
	};
};

