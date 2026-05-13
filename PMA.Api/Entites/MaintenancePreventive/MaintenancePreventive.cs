namespace PMA.Api.Entites;

public class MaintenancePreventive
{
    public int Id { get; set; }
    public string Equipement { get; set; } = string.Empty;
    public string TypeEquipement { get; set; } = "bonbonne";
    public string TypeMaintenance { get; set; } = string.Empty;
    public DateTime DerniereExecution { get; set; }
    public DateTime ProchaineExecution { get; set; }
    public int FrequenceJours { get; set; } = 90;
    public string Responsable { get; set; } = string.Empty;
    public string Statut { get; set; } = "a_jour";
    public string Notes { get; set; } = string.Empty;
}
