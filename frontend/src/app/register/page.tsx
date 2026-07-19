"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "@/lib/api";

type Form = {
  name: string; email: string; mobile: string; city: string;
  state: string; password: string; confirm_password: string;
};

export default function RegisterPage() {
  const { register, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm<Form>();
  const router = useRouter();

  async function onSubmit(data: Form) {
    try {
      await api.register(data);
      toast.success("Registered! Your account is pending admin approval.");
      router.push("/login");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Student Name</label>
          <input className="input" {...register("name", { required: true })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Email</label>
          <input className="input" type="email" {...register("email", { required: true })} />
        </div>
        <div>
          <label className="label">Mobile Number</label>
          <input className="input" {...register("mobile")} />
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" {...register("city")} />
        </div>
        <div>
          <label className="label">State</label>
          <input className="input" {...register("state")} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" {...register("password", { required: true, minLength: 8 })} />
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input className="input" type="password"
            {...register("confirm_password", {
              required: true,
              validate: (v) => v === watch("password") || "Passwords do not match",
            })} />
          {errors.confirm_password && (
            <p className="mt-1 text-xs text-red-500">{errors.confirm_password.message}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <button className="btn w-full" disabled={isSubmitting}>
            {isSubmitting ? "Registering…" : "Register"}
          </button>
        </div>
      </form>
    </div>
  );
}
