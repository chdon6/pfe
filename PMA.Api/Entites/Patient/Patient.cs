using System;
using System.Collections.Generic;
using PMA.Api.Entites;

namespace PMA.Api.Entites;

public class Patient
{
    public int Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public DateTime DateNaissance { get; set; }
    public string? FemmeNom { get; set; }
    public string? FemmePrenom { get; set; }
    public DateTime? FemmeDateNaissance { get; set; }
    public string NumDossier { get; set; } = string.Empty;
    /// <summary>couple | spermogramme</summary>
    public string TypeDossier { get; set; } = "couple";
    public string? TypeActePma { get; set; }
    public string? Adresse { get; set; }
    public string? Telephone { get; set; }
    public string? ImagePath { get; set; }

    public ICollection<RendezVous> RendezVous { get; set; } = new List<RendezVous>();
    public ICollection<Consentement> Consentements { get; set; } = new List<Consentement>();
    public ICollection<ActePma> ActesPma { get; set; } = new List<ActePma>();
    public ICollection<ElementBiologique> ElementsBiologiques { get; set; } = new List<ElementBiologique>();
    public ICollection<CyclePma> CyclesPma { get; set; } = new List<CyclePma>();
}
