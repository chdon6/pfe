using System;

namespace PMA.Api.Entites;

public class Consentement
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public DateTime DateSignature { get; set; }
    public string? PhotoPath { get; set; }
    public string? CinHommePath { get; set; }
    public string? CinFemmePath { get; set; }
    public string? ContratMariagePath { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
}
