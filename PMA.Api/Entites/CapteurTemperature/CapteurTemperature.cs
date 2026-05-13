namespace PMA.Api.Entites;

public class CapteurTemperature
{
    public int Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public int BonbonneId { get; set; }
    public double TemperatureActuelle { get; set; }
    public double TemperatureCible { get; set; }
    public double SeuilAlerte { get; set; } = 3.0;
    public string Statut { get; set; } = "normal";
    public DateTime DerniereMaj { get; set; } = DateTime.UtcNow;

    public Bonbonne? Bonbonne { get; set; }
    public ICollection<HistoriqueTemperature> Historiques { get; set; } = new List<HistoriqueTemperature>();
}
