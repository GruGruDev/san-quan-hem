export default function RoomRoster({
  players = [],
  currentSocketId,
  hostSocketId,
  turnId,
  mode = "1v1",
  canSwap = false,
  onSwapTeams,
}) {
  const slotsPerTeam = mode === "2v2" ? 2 : 1;
  const currentTeam = players.find(
    (player) => player.socketId === currentSocketId,
  )?.team;
  const teams = [
    { id: "red", label: "ĐỘI ĐỎ", color: "border-rose-500/40 text-rose-300" },
    { id: "blue", label: "ĐỘI XANH", color: "border-sky-500/40 text-sky-300" },
  ];

  return (
    <section className="w-full rounded-xl border border-slate-700 bg-slate-950/80 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase text-slate-300">
          Đội hình {mode}
        </h2>
        {canSwap && (
          <span className="text-[9px] font-bold text-amber-300">
            Chạm ĐỔI ĐỘI để hoán đổi
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {teams.map((team) => {
          const members = players.filter((player) => player.team === team.id);
          return (
            <div
              key={team.id}
              className={`min-w-0 rounded-lg border bg-slate-900/80 p-2 ${team.color}`}
            >
              <h3 className="mb-1 text-[9px] font-black">{team.label}</h3>
              <div className="flex flex-col gap-1">
                {Array.from({ length: slotsPerTeam }, (_, index) => {
                  const player = members[index];
                  if (!player) {
                    return (
                      <div
                        key={`empty-${team.id}-${index}`}
                        className="flex h-7 items-center rounded-md border border-dashed border-slate-700 px-2 text-[9px] text-slate-600"
                      >
                        Chờ người chơi
                      </div>
                    );
                  }

                  const isCurrent = player.socketId === currentSocketId;
                  return (
                    <div
                      key={player.socketId}
                      className={`flex min-w-0 items-center justify-between gap-1 rounded-md px-1.5 py-1 text-[9px] ${player.eliminated ? "bg-slate-950 text-slate-500 line-through" : "bg-slate-800 text-slate-100"}`}
                    >
                      <span className="min-w-0 truncate">
                        {player.socketId === hostSocketId ? "♛ " : ""}
                        {player.name}
                        {isCurrent ? " (bạn)" : ""}
                        {player.socketId === turnId ? " · lượt" : ""}
                        {player.connected === false ? " · mất kết nối" : ""}
                      </span>
                      {canSwap &&
                        !isCurrent &&
                        player.team !== currentTeam &&
                        !player.eliminated && (
                          <button
                            type="button"
                            onClick={() => onSwapTeams?.(player.socketId)}
                            className="shrink-0 rounded bg-amber-500/15 px-1 py-1 font-black text-amber-300"
                            title={`Hoán đổi đội với ${player.name}`}
                          >
                            ĐỔI ĐỘI
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
