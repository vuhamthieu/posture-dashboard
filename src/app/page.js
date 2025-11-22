// src/app/page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Home() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("posture_logs")
        .select("*")
        .gte("created_at", oneHourAgo)
        .order("created_at", { ascending: true });

      setHistory(data || []);
      if (data && data.length > 0) setLatest(data[data.length - 1]);
    }
    fetchHistory();
  }, []);

  // Realtime listener
  useEffect(() => {
    const channel = supabase
      .channel("posture-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posture_logs",
        },
        (payload) => {
          const newLog = payload.new;
          setLatest(newLog);
          setHistory((prev) => {
            const updated = [...prev, newLog];
            return updated.slice(-100); 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const currentAngle = latest?.neck_angle ?? 0;
  const currentStatus = latest?.status ?? "OK";

  const statusColor =
    currentStatus === "OK"
      ? "text-green-400"
      : currentStatus === "BAD"
      ? "text-yellow-400"
      : "text-red-500";

  const chartData = history.map((item) => ({
    time: new Date(item.created_at).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    angle: item.neck_angle,
  }));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <h1 className="text-center text-3xl md:text-5xl font-bold mb-8">
        Smart Posture Monitor
      </h1>

      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-2xl p-8 text-center shadow-xl">
          <div className="text-6xl md:text-8xl font-bold mb-4">
            {currentAngle.toFixed(1)}°
          </div>
          <div className={`text-4xl md:text-6xl font-bold ${statusColor}`}>
            {currentStatus}
          </div>
          <div className="text-gray-400 mt-6 text-lg">
            {new Date().toLocaleString("vi-VN")}
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl md:text-2xl mb-4 text-center">
            Góc cổ – 60 phút gần nhất
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="time"
                stroke="#888"
                style={{ fontSize: "14px" }}
              />
              <YAxis domain={[0, 90]} stroke="#888" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "none" }}
                labelStyle={{ color: "#00ff88" }}
              />
              <Line
                type="monotone"
                dataKey="angle"
                stroke="#00ff88"
                strokeWidth={4}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-center mt-12 text-gray-500 text-sm">
        Raspberry Pi + MediaPipe + Supabase + Next.js
      </div>
    </div>
  );
}