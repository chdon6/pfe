namespace PMA.Api.Entites;

public class NiveauAzote
{
    public int Id { get; set; }
    public int BonbonneId { get; set; }
    public double NiveauPourcentage { get; set; }
    public double VolumeLitres { get; set; }
    public double CapaciteLitres { get; set; }
    public double SeuilAlerte { get; set; } = 30.0;
    public DateTime DernierRemplissage { get; set; }
    public DateTime ProchainRemplissage { get; set; }
    public string Statut { get; set; } = "ok";

    public Bonbonne? Bonbonne { get; set; }
}
