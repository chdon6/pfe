namespace PMA.Api.Services;

/// <summary>Numérotation séquentielle des dossiers patients (PMA-0001, PMA-0002…).</summary>
public static class NumeroDossierGenerator
{
    public const string Prefix = "PMA-";

    /// <summary>Extrait la partie numérique d'un N° dossier (ex. « pma-2555 » → 2555).</summary>
    public static int ExtractSequence(string? numDossier)
    {
        if (string.IsNullOrWhiteSpace(numDossier)) return 0;
        var digits = new string(numDossier.Where(char.IsDigit).ToArray());
        if (digits.Length == 0) return 0;
        return int.TryParse(digits, out var n) ? n : 0;
    }

    public static string Format(int sequence) => $"{Prefix}{sequence:D4}";

    /// <summary>Prochain numéro libre, sans collision avec les dossiers existants (comparaison insensible à la casse).</summary>
    public static string AllocateNext(IEnumerable<string?> existingNumDossiers)
    {
        var set = new HashSet<string>(
            existingNumDossiers
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s!.Trim()),
            StringComparer.OrdinalIgnoreCase);

        var max = existingNumDossiers.Max(ExtractSequence);
        var seq = max + 1;
        string candidate;
        do
        {
            candidate = Format(seq);
            seq++;
        } while (set.Contains(candidate));

        return candidate;
    }
}
