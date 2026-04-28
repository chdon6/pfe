using System.Linq;

namespace PMA.Api.Services;

/// <summary>Types d'actes PMA prescrits par dossier ; réalisation par le biologiste.</summary>
public static class ActePmaCatalog
{
    public static readonly string[] Codes =
    [
        "fiv",
        "icsi",
        "insemination",
        "ponction_ovocytes",
        "transfer_embryonnaire",
        "congelation_embryons",
        "biopsie_embryonnaire",
        "don_ovocytes",
        "don_sperme",
        "spermogramme_bilan",
        "preparation_sperme",
        "cryoconservation_sperme",
        "tesa",
        "tese",
        "mesa",
        "pesa",
        "autre"
    ];

    public static readonly string[] StatutsRealisation = ["a_realiser", "en_cours", "realise", "annule"];

    public static bool IsValidType(string? code) =>
        !string.IsNullOrWhiteSpace(code) && Codes.Contains(code.Trim().ToLowerInvariant());

    public static bool IsValidStatut(string? code) =>
        !string.IsNullOrWhiteSpace(code) && StatutsRealisation.Contains(code.Trim().ToLowerInvariant());

    public static string NormalizeType(string code) => code.Trim().ToLowerInvariant();

    public static string NormalizeStatut(string? code) =>
        string.IsNullOrWhiteSpace(code) ? "a_realiser" : code.Trim().ToLowerInvariant();

    public static string LibelleDefaut(string typeCode)
    {
        var t = typeCode.Trim().ToLowerInvariant();
        return t switch
        {
            "fiv" => "Fécondation in vitro (FIV)",
            "icsi" => "ICSI — injection intracytoplasmique",
            "insemination" => "Insémination intra-utérine (IIU)",
            "ponction_ovocytes" => "Ponction ovocytes",
            "transfer_embryonnaire" => "Transfert embryonnaire",
            "congelation_embryons" => "Congélation d'embryons",
            "biopsie_embryonnaire" => "Biopsie embryonnaire (PGT)",
            "don_ovocytes" => "AMP avec don d'ovocytes",
            "don_sperme" => "AMP avec don de sperme",
            "spermogramme_bilan" => "Spermogramme / bilan andrologique",
            "preparation_sperme" => "Préparation du sperme (capacitation, lavage)",
            "cryoconservation_sperme" => "Cryoconservation du sperme",
            "tesa" => "TESA — aspiration testiculaire",
            "tese" => "TESE / micro-TESE — biopsie testiculaire",
            "mesa" => "MESA — aspiration microchirurgicale épididymaire",
            "pesa" => "PESA — ponction épididymaire percutanée",
            "autre" => "Autre acte PMA",
            _ => typeCode
        };
    }
}
