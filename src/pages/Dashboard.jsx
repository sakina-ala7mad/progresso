import React, { useState } from "react";
import TodayStats from "../components/dashboard/TodayStats";
import WeeklyStats from "../components/dashboard/WeeklyStats";
import MonthlyStats from "../components/dashboard/MonthlyStats";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("day");

  const tabs = [
    { id: "day", label: "Day", component: TodayStats, bgColor: "bg-yellow-50" },
    { id: "week", label: "Week", component: WeeklyStats, bgColor: "bg-pink-50" },
    { id: "month", label: "Month", component: MonthlyStats, bgColor: "bg-blue-50" }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Focus Analytics</h1>
          <p className="text-gray-600">Track your productivity and focus sessions</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-1 shadow-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-blue-500 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Tab Content */}
        <div className={`${tabs.find(tab => tab.id === activeTab)?.bgColor} p-6 rounded-2xl`}>
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}
