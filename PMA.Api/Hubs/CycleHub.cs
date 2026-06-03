using Microsoft.AspNetCore.SignalR;

namespace PMA.Api.Hubs;

/// <summary>
/// Hub SignalR pour les mises à jour en temps réel des cycles PMA.
/// Les clients rejoignent un groupe par cycle pour recevoir les notifications ciblées.
/// </summary>
public class CycleHub : Hub
{
    /// <summary>Abonne la connexion courante aux mises à jour d'un cycle donné.</summary>
    public Task JoinCycle(int cycleId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, GroupName(cycleId));

    /// <summary>Désabonne la connexion courante des mises à jour d'un cycle.</summary>
    public Task LeaveCycle(int cycleId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(cycleId));

    /// <summary>Abonne la connexion aux mises à jour de la liste des cycles (vue agrégée).</summary>
    public Task JoinCyclesList() =>
        Groups.AddToGroupAsync(Context.ConnectionId, CyclesListGroup);

    public Task LeaveCyclesList() =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, CyclesListGroup);

    public static string GroupName(int cycleId) => $"cycle_{cycleId}";

    public const string CyclesListGroup = "cycles_list";
}
