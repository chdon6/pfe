namespace PMA.Api.Entites;

public class HistoriqueTemperature
{
    public int Id { get; set; }
    public int CapteurTemperatureId { get; set; }
    public double Valeur { get; set; }
    public DateTime DateMesure { get; set; } = DateTime.UtcNow;

    public CapteurTemperature? CapteurTemperature { get; set; }
}
