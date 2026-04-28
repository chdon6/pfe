using System;

namespace PMA.Api.Entites;

public class ElementBiologique
{
    public int Id { get; set; }
    public string TypeElement { get; set; } = string.Empty;
    public DateTime DateCreation { get; set; }
    public string? NumeroTube { get; set; }
    public string? CodeBarre { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
}
