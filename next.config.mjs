const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "nvch-media.s3.ca-central-1.amazonaws.com",
			},
		],
	},
};

export default nextConfig;
