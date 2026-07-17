"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Form = { email: string; password: string };

export default function LoginPage() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Form>();
  const { login } = useAuth();
  const router = useRouter();

  async function onSubmit(data: Form) {
    try {
      const res = await api.login(data);
      login({ name: res.name, role: res.role as "admin" | "user", status: res.status, token: res.access_token });
      toast.success(`Welcome back, ${res.name}!`);
      router.push(res.role === "admin" ? "/admin" : "/predict");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">Login</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" {...register("email", { required: true })} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" {...register("password", { required: true })} />
        </div>
        <button className="btn w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Login"}
        </button>
        <p className="text-center text-sm text-slate-500">
          No account? <a href="/register" className="text-brand-600">Register</a>
        </p>
      </form>
    </div>
  );
}
