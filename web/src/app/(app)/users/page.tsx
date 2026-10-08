"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  Search,
  KeyRound,
  Edit2,
  ShieldCheck,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  Navigation,
  UserCheck,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

interface AreaInfo {
  id: number;
  name: string;
  route_id: number;
}

interface RouteInfo {
  id: number;
  route_number: number;
  type: string;
  areas: AreaInfo[];
}

interface UserItem {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: "admin" | "sales_executive" | "delivery_executive" | "accountant";
  assigned_route_id?: number | null;
  assigned_route_number?: number | null;
  is_active: boolean;
  created_at?: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: "Admin", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  sales_executive: { label: "Sales Executive", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  accountant: { label: "Accountant", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  delivery_executive: { label: "Delivery Exec", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "sales_executive",
    assigned_route_id: "" as string | number,
    is_active: true,
  });

  const [passwordReset, setPasswordReset] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Load users and routes
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, routesRes] = await Promise.all([
        authFetch("/users/"),
        authFetch("/areas/routes/"),
      ]);

      if (!usersRes.ok) throw new Error("Failed to load users list");
      const usersData = await usersRes.json();
      setUsers(usersData);

      if (routesRes.ok) {
        const routesData = await routesRes.json();
        setRoutes(routesData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load users from backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = (defaultRole: string = "sales_executive", defaultRouteId: string | number = "") => {
    // If route 07 exists, default to it when adding sales executive if preferred
    let routeId = defaultRouteId;
    if (!routeId && defaultRole === "sales_executive") {
      const r7 = routes.find((r) => r.route_number === 7);
      if (r7) routeId = r7.id;
    }

    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      role: defaultRole,
      assigned_route_id: routeId,
      is_active: true,
    });
    setError("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      role: user.role,
      assigned_route_id: user.assigned_route_id || "",
      is_active: user.is_active,
    });
    setError("");
    setIsEditModalOpen(true);
  };

  const openPasswordModal = (user: UserItem) => {
    setSelectedUser(user);
    setPasswordReset({ newPassword: "", confirmPassword: "" });
    setError("");
    setIsPasswordModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill all required fields (Name, Email, Password)");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        phone: formData.phone.trim() || undefined,
        is_active: formData.is_active,
        assigned_route_id:
          formData.role === "sales_executive" && formData.assigned_route_id
            ? Number(formData.assigned_route_id)
            : null,
      };

      const res = await authFetch("/users/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create user");
      }

      setSuccessMsg(`User ${formData.name} created successfully!`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setError("");

    try {
      const payload: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        role: formData.role,
        is_active: formData.is_active,
        assigned_route_id:
          formData.role === "sales_executive" && formData.assigned_route_id
            ? Number(formData.assigned_route_id)
            : null,
      };

      const res = await authFetch(`/users/${selectedUser.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to update user");
      }

      setSuccessMsg(`User ${formData.name} updated successfully!`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (passwordReset.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (passwordReset.newPassword !== passwordReset.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await authFetch(`/users/${selectedUser.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ new_password: passwordReset.newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to reset password");
      }

      setSuccessMsg(`Password reset successfully for ${selectedUser.name}!`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setIsPasswordModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (user: UserItem) => {
    try {
      const res = await authFetch(`/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
        );
      }
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  // Filtered list
  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q)) ||
      (u.assigned_route_number && `route ${u.assigned_route_number}`.includes(q));

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesRoute =
      routeFilter === "all" ||
      (routeFilter === "none" && !u.assigned_route_id) ||
      (u.assigned_route_id && String(u.assigned_route_id) === routeFilter);

    return matchesSearch && matchesRole && matchesRoute;
  });

  // Quick statistics
  const totalUsers = users.length;
  const salesExecs = users.filter((u) => u.role === "sales_executive");
  const activeCount = users.filter((u) => u.is_active).length;
  const route07Executive = users.find(
    (u) => u.role === "sales_executive" && u.assigned_route_number === 7
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <UsersIcon className="text-[#F97316]" size={28} />
            User Management & Route Scoping
          </h1>
          <p className="text-sm text-white/50 mt-0.5">
            Manage system users, login credentials, and assign dedicated sales routes (e.g. Route 07)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all flex items-center gap-2 text-sm"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => openAddModal("sales_executive")}
            className="px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#ea580c] text-white font-medium text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
          >
            <UserPlus size={18} />
            Add User / Sales Executive
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 text-sm animate-fade-in">
          <CheckCircle2 size={18} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Global Error Banner */}
      {error && !isAddModalOpen && !isEditModalOpen && !isPasswordModalOpen && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E293B]/70 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs uppercase font-semibold">Total Accounts</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <UsersIcon size={18} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{totalUsers}</div>
          <div className="text-xs text-white/40 mt-1">{activeCount} active in system</div>
        </div>

        <div className="bg-[#1E293B]/70 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs uppercase font-semibold">Sales Executives</span>
            <span className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <Navigation size={18} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{salesExecs.length}</div>
          <div className="text-xs text-white/40 mt-1">Route-scoped field staff</div>
        </div>

        <div className="bg-[#1E293B]/70 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs uppercase font-semibold">Route 07 Assigned</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <MapPin size={18} />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-white truncate">
            {route07Executive ? route07Executive.name : "Not Assigned"}
          </div>
          <div className="text-xs text-emerald-400/80 mt-1">
            {route07Executive ? "Active Route 07 Executive" : "Needs sales executive"}
          </div>
        </div>

        <div className="bg-[#1E293B]/70 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs uppercase font-semibold">Available Routes</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <ShieldCheck size={18} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{routes.length || 10}</div>
          <div className="text-xs text-white/40 mt-1">10 configured territory routes</div>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="bg-[#1E293B]/70 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between backdrop-blur-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or route..."
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F97316] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <SlidersHorizontal size={14} />
            <span>Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316] transition-all"
          >
            <option value="all" className="bg-[#0F172A]">All Roles</option>
            <option value="sales_executive" className="bg-[#0F172A]">Sales Executive</option>
            <option value="admin" className="bg-[#0F172A]">Admin</option>
            <option value="accountant" className="bg-[#0F172A]">Accountant</option>
            <option value="delivery_executive" className="bg-[#0F172A]">Delivery Executive</option>
          </select>

          <div className="flex items-center gap-2 text-xs text-white/50 ml-2">
            <span>Route:</span>
          </div>
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316] transition-all"
          >
            <option value="all" className="bg-[#0F172A]">All Routes</option>
            <option value="none" className="bg-[#0F172A]">No Route Assigned</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id} className="bg-[#0F172A]">
                Route {String(r.route_number).padStart(2, "0")} ({r.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#1E293B]/70 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/80">
            <thead className="text-xs uppercase bg-white/5 text-white/40 border-b border-white/10 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">User / Staff</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Assigned Territory / Route</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                    <Loader2 size={28} className="animate-spin mx-auto mb-2 text-[#F97316]" />
                    <span>Loading user directory...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                    <UserCheck size={32} className="mx-auto mb-2 opacity-40" />
                    <span>No users match the selected filters.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleConfig = ROLE_LABELS[u.role] || {
                    label: u.role,
                    color: "text-white/60",
                    bg: "bg-white/10 border-white/10",
                  };

                  const assignedRoute = routes.find((r) => r.id === u.assigned_route_id);

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Name and Email */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F97316]/20 to-purple-500/20 border border-white/10 flex items-center justify-center font-bold text-white text-sm">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-[#F97316] transition-colors">
                              {u.name}
                            </div>
                            <div className="text-xs text-white/40 flex items-center gap-1.5 mt-0.5">
                              <Mail size={12} />
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${roleConfig.bg} ${roleConfig.color}`}
                        >
                          {roleConfig.label}
                        </span>
                      </td>

                      {/* Route Scoping */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.role === "sales_executive" ? (
                          u.assigned_route_number ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/30 w-fit">
                                <MapPin size={12} />
                                Route {String(u.assigned_route_number).padStart(2, "0")}
                                {assignedRoute ? ` (${assignedRoute.type})` : ""}
                              </span>
                              {assignedRoute?.areas && (
                                <span className="text-[11px] text-white/40 mt-1 max-w-xs truncate">
                                  {assignedRoute.areas.map((a) => a.name).join(", ")}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              No Route Assigned
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-white/30 italic">All Routes / Central</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-white/60">
                        {u.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone size={12} className="text-white/40" />
                            {u.phone}
                          </span>
                        ) : (
                          <span className="text-white/30">--</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleUserStatus(u)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                            u.is_active
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                          }`}
                          title="Click to toggle status"
                        >
                          {u.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {u.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all flex items-center gap-1"
                            title="Edit User & Route"
                          >
                            <Edit2 size={14} />
                            <span className="hidden sm:inline">Edit</span>
                          </button>

                          <button
                            onClick={() => openPasswordModal(u)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all flex items-center gap-1"
                            title="Reset Password"
                          >
                            <KeyRound size={14} />
                            <span className="hidden sm:inline">Password</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: ADD USER / SALES EXECUTIVE ───────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1E293B] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <UserPlus size={20} className="text-[#F97316]" />
                <h2 className="text-lg font-bold text-white">Add New User</h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-white/70">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ramesh@indopaints.com"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70">Login Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70">System Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]"
                  >
                    <option value="sales_executive" className="bg-[#0F172A]">Sales Executive</option>
                    <option value="admin" className="bg-[#0F172A]">Admin</option>
                    <option value="accountant" className="bg-[#0F172A]">Accountant</option>
                    <option value="delivery_executive" className="bg-[#0F172A]">Delivery Executive</option>
                  </select>
                </div>
              </div>

              {/* Dedicated Assigned Route Section for Sales Executive */}
              {formData.role === "sales_executive" && (
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#F97316] flex items-center gap-1.5">
                      <MapPin size={14} />
                      Assign Dedicated Sales Route
                    </label>
                    <span className="text-[11px] text-white/40">Restricts app data access</span>
                  </div>

                  <select
                    value={formData.assigned_route_id}
                    onChange={(e) => setFormData({ ...formData, assigned_route_id: e.target.value })}
                    className="w-full bg-black/30 border border-[#F97316]/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]"
                  >
                    <option value="" className="bg-[#0F172A]">-- Select Route (e.g. Route 07) --</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id} className="bg-[#0F172A]">
                        Route {String(r.route_number).padStart(2, "0")} ({r.type.toUpperCase()}) -{" "}
                        {r.areas.map((a) => a.name).slice(0, 3).join(", ")}
                        {r.areas.length > 3 ? "..." : ""}
                      </option>
                    ))}
                  </select>

                  <p className="text-[11px] text-white/50 leading-relaxed">
                    * The executive will only see customers, sales orders, collections, and invoices belonging to this assigned route.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#F97316] hover:bg-[#ea580c] text-white font-medium text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: EDIT USER & ROUTE ASSIGNMENT ─────────────────────────── */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1E293B] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Edit2 size={20} className="text-[#F97316]" />
                <h2 className="text-lg font-bold text-white">Edit User: {selectedUser.name}</h2>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-white/70">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70">Email (Read Only)</label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-sm text-white/40 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]"
                  >
                    <option value="sales_executive" className="bg-[#0F172A]">Sales Executive</option>
                    <option value="admin" className="bg-[#0F172A]">Admin</option>
                    <option value="accountant" className="bg-[#0F172A]">Accountant</option>
                    <option value="delivery_executive" className="bg-[#0F172A]">Delivery Executive</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70">Account Status</label>
                  <select
                    value={formData.is_active ? "active" : "inactive"}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.value === "active" })
                    }
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]"
                  >
                    <option value="active" className="bg-[#0F172A]">Active</option>
                    <option value="inactive" className="bg-[#0F172A]">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Route assignment selection */}
              {formData.role === "sales_executive" && (
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#F97316] flex items-center gap-1.5">
                      <MapPin size={14} />
                      Assigned Sales Route
                    </label>
                  </div>

                  <select
                    value={formData.assigned_route_id}
                    onChange={(e) => setFormData({ ...formData, assigned_route_id: e.target.value })}
                    className="w-full bg-black/30 border border-[#F97316]/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]"
                  >
                    <option value="" className="bg-[#0F172A]">-- No Route Assigned --</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id} className="bg-[#0F172A]">
                        Route {String(r.route_number).padStart(2, "0")} ({r.type.toUpperCase()}) -{" "}
                        {r.areas.map((a) => a.name).slice(0, 3).join(", ")}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#F97316] hover:bg-[#ea580c] text-white font-medium text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Edit2 size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: RESET PASSWORD ──────────────────────────────────────── */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1E293B] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <KeyRound size={20} className="text-[#F97316]" />
                <h2 className="text-lg font-bold text-white">Reset Password</h2>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-xs text-white/60">
                Set a new login password for <strong className="text-white">{selectedUser.name}</strong> ({selectedUser.email}).
              </p>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70">New Password *</label>
                <input
                  type="password"
                  required
                  value={passwordReset.newPassword}
                  onChange={(e) =>
                    setPasswordReset({ ...passwordReset, newPassword: e.target.value })
                  }
                  placeholder="Minimum 6 characters"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={passwordReset.confirmPassword}
                  onChange={(e) =>
                    setPasswordReset({ ...passwordReset, confirmPassword: e.target.value })
                  }
                  placeholder="Re-enter new password"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#F97316] hover:bg-[#ea580c] text-white font-medium text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
