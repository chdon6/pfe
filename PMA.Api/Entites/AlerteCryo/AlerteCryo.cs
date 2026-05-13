namespace PMA.Api.Entites;

public class AlerteCryo
{
    public int Id { get; set; }
    public DateTime DateAlerte { get; set; } = DateTime.UtcNow;
    public string Type { get; set; } = "systeme";
    public string Severite { get; set; } = "info";
    public string Message { get; set; } = string.Empty;
    public string Equipement { get; set; } = string.Empty;
    public bool Acquittee { get; set; }
}
