"use client";

import { useActionState, useState } from "react";
import { DIAS_SEMANA } from "@/lib/personal/reglas";
import { guardarHorario, type EstadoHorario } from "./actions";

type DiaExistente = {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
};

export function HorarioForm({
  operarioId,
  horariosActuales,
}: {
  operarioId: string;
  horariosActuales: DiaExistente[];
}) {
  const accionConId = guardarHorario.bind(null, operarioId);
  const [estado, formAction, enviando] = useActionState<
    EstadoHorario,
    FormData
  >(accionConId, null);

  const [activos, setActivos] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(
      DIAS_SEMANA.map((d) => [
        d.valor,
        horariosActuales.some((h) => h.dia_semana === d.valor),
      ]),
    ),
  );

  const horarioDe = (dia: number) =>
    horariosActuales.find((h) => h.dia_semana === dia);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {DIAS_SEMANA.map((dia) => {
        const existente = horarioDe(dia.valor);
        const activo = activos[dia.valor];
        return (
          <div
            key={dia.valor}
            className="flex flex-wrap items-center gap-3 rounded-sm border border-borde p-3"
          >
            <label className="flex w-28 items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name={`activo_${dia.valor}`}
                defaultChecked={activo}
                onChange={(e) =>
                  setActivos((prev) => ({
                    ...prev,
                    [dia.valor]: e.target.checked,
                  }))
                }
              />
              {dia.nombre}
            </label>
            {activo ? (
              <div className="flex items-center gap-2 font-mono text-sm">
                <input
                  type="time"
                  name={`inicio_${dia.valor}`}
                  defaultValue={existente?.hora_inicio.slice(0, 5) ?? "08:00"}
                  className="rounded-sm border border-borde bg-superficie px-2 py-1"
                  required
                />
                <span>a</span>
                <input
                  type="time"
                  name={`fin_${dia.valor}`}
                  defaultValue={existente?.hora_fin.slice(0, 5) ?? "17:00"}
                  className="rounded-sm border border-borde bg-superficie px-2 py-1"
                  required
                />
              </div>
            ) : (
              <span className="text-sm opacity-60">Franco</span>
            )}
          </div>
        );
      })}

      {estado?.error && (
        <p
          role="alert"
          className="rounded-sm border border-negativo bg-negativo/10 px-3 py-2 text-sm text-negativo"
        >
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-2 rounded-sm bg-acento px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Guardando…" : "Guardar horario"}
      </button>
    </form>
  );
}
