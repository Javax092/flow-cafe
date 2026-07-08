"use client";

import { useActionState } from "react";

import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="username" className="mb-2 block text-sm font-medium text-zinc-700">
          Usuário
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
          placeholder="admin ou garcom"
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-700">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
        />
      </div>
      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-amber-900 px-4 py-3 font-semibold text-white transition hover:bg-amber-800 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
