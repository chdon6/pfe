using System;

namespace PMA.Entites;

public class ElementBiologique
{
    public int Id { get; set; }
    public string TypeElement { get; set; } = string.Empty;
    public DateTime DateCreation { get; set; }
    public string? NumeroTube { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
}
