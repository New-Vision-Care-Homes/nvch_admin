"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUsers.js";

const UserAvatar = ({ userId }) => {
  const [imgSrc, setImgSrc] = useState("/img/navbar/avatar.jpg");
  const { data, isLoading } = useUser(userId);

  const fileKey = data?.data?.user?.profilePicture;

  useEffect(() => {
    if (!fileKey) return;

    const token = localStorage.getItem("token");

    fetch(
      `https://nvch-server.onrender.com/api/upload/file-url?fileKey=${encodeURIComponent(
        fileKey
      )}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
      .then(res => res.json())
      .then(url => setImgSrc(url))
      .catch(() => setImgSrc("/img/navbar/avatar.jpg"));
  }, [fileKey]);

  return (
    <Image
      src={imgSrc}
      width={50}
      height={50}
      alt="avatar"
      style={{ borderRadius: "50%", objectFit: "cover" }}
      unoptimized
    />
  );
};

export default UserAvatar;
