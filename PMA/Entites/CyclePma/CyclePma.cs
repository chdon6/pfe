using System;
using System.Collections.Generic;

namespace PMA.Entites;

public class CyclePma
{
    public int Id { get; set; }
    public string Phase { get; set; } = string.Empty;
    public string StatutCycle { get; set; } = "brouillon";
    public string EtapeCourante { get; set; } = string.Empty;
    public DateTime DateDebut { get; set; }
    public DateTime? DateFin { get; set; }
    public DateTime DerniereMiseAJour { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public int? ProtocoleId { get; set; }
    public Protocole? Protocole { get; set; }

    public ICollection<PailleTube> PailleTubes { get; set; } = new List<PailleTube>();
    public ICollection<CycleEtapeHistorique> EtapesHistorique { get; set; } = new List<CycleEtapeHistorique>();
}
