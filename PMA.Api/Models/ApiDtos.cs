namespace PMA.Api.Models;

public class UserDto
{
    public int Id { get; set; }
    public string Nom { get; set; } = "";
    public string Prenom { get; set; } = "";
    public string Identifiant { get; set; } = "";
    public string Telephone { get; set; } = "";
    public int? ProfileId { get; set; }
    /// <summary>Libellé du profil (lecture seule).</summary>
    public string? ProfileLibelle { get; set; }
}

/// <summary>Création / mise à jour utilisateur — mot de passe jamais renvoyé.</summary>
public class UserUpsertDto
{
    public int Id { get; set; }
    public string Nom { get; set; } = "";
    public string Prenom { get; set; } = "";
    public string Identifiant { get; set; } = "";
    public string? Telephone { get; set; }
    public int? ProfileId { get; set; }
    /// <summary>Obligatoire à la création ; optionnel à la mise à jour (laisser vide pour ne pas changer).</summary>
    public string? Password { get; set; }
}

public class LoginRequestDto
{
    public string Identifiant { get; set; } = "";
    public string Password { get; set; } = "";
}

public class LoginResponseDto
{
    public string Token { get; set; } = "";
    public UserDto User { get; set; } = null!;
}
