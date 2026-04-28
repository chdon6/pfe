using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;
using PMA.Api.Models;
using PMA.Api.Services;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Administrateur")]
public class UsersController(IUnitOfWork uow) : ControllerBase
{
    private static readonly HashSet<string> AssignableProfiles =
 ["Technicien", "Secretaire", "Biologiste"];

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll()
    {
        var labels = await ProfileLabelsAsync();
        var list = await uow.Users.ListAsync();
        return Ok(list.Select(u => Map(u, labels)).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserDto>> GetById(int id)
    {
        var u = await uow.Users.GetByIdAsync(id);
        if (u is null) return NotFound();
        var labels = await ProfileLabelsAsync();
        return Ok(Map(u, labels));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UserUpsertDto dto)
    {
        var err = await ValidateUpsert(dto, isCreate: true);
        if (err is not null) return err;

        var entity = new User
        {
            Nom = dto.Nom.Trim(),
            Prenom = dto.Prenom.Trim(),
            Identifiant = dto.Identifiant.Trim(),
            Telephone = dto.Telephone?.Trim() ?? "",
            ProfileId = dto.ProfileId,
            PasswordHash = PasswordHasher.Sha256Hex(dto.Password!.Trim())
        };
        await uow.Users.AddAsync(entity);
        await uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new { id = entity.Id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UserUpsertDto dto)
    {
        if (id != dto.Id) return BadRequest();
        var err = await ValidateUpsert(dto, isCreate: false, id);
        if (err is not null) return err;

        var entity = await uow.Users.GetByIdAsync(id);
        if (entity is null) return NotFound();

        entity.Nom = dto.Nom.Trim();
        entity.Prenom = dto.Prenom.Trim();
        entity.Identifiant = dto.Identifiant.Trim();
        entity.Telephone = dto.Telephone?.Trim() ?? "";
        entity.ProfileId = dto.ProfileId;
        if (!string.IsNullOrWhiteSpace(dto.Password))
            entity.PasswordHash = PasswordHasher.Sha256Hex(dto.Password.Trim());

        await uow.Users.UpdateAsync(entity);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await uow.Users.GetByIdAsync(id);
        if (entity is null) return NotFound();

        var profiles = await uow.Profiles.ListAsync();
        var adminProf = profiles.FirstOrDefault(p => p.Libelle == "Administrateur");
        if (adminProf is not null && entity.ProfileId == adminProf.Id)
        {
            var admins = await uow.Users.ListAsync(u => u.ProfileId == adminProf.Id);
            if (admins.Count <= 1)
                return BadRequest("Impossible de supprimer le dernier administrateur.");
        }

        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(sub, out var myId) && myId == id)
            return BadRequest("Vous ne pouvez pas supprimer votre propre compte.");

        await uow.Users.DeleteAsync(entity);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    private async Task<IActionResult?> ValidateUpsert(UserUpsertDto dto, bool isCreate, int? existingId = null)
    {
        if (string.IsNullOrWhiteSpace(dto.Nom) || string.IsNullOrWhiteSpace(dto.Prenom) ||
            string.IsNullOrWhiteSpace(dto.Identifiant))
            return BadRequest("Nom, prénom et identifiant sont obligatoires.");

        if (isCreate && string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest("Le mot de passe est obligatoire pour un nouvel utilisateur.");

        if (!dto.ProfileId.HasValue || dto.ProfileId.Value <= 0)
            return BadRequest("Le profil est obligatoire.");

        var profile = await uow.Profiles.GetByIdAsync(dto.ProfileId.Value);
        if (profile is null)
            return BadRequest("Profil inconnu.");

        var allProfiles = await uow.Profiles.ListAsync();
        var adminProf = allProfiles.FirstOrDefault(p => p.Libelle == "Administrateur");
        User? existing = null;
        if (existingId is { } uid)
            existing = await uow.Users.GetByIdAsync(uid);

        if (adminProf is not null && existing?.ProfileId == adminProf.Id)
        {
            if (dto.ProfileId != adminProf.Id)
                return BadRequest("Le profil Administrateur de ce compte ne peut pas être modifié depuis cet écran.");
        }
        else
        {
            if (!AssignableProfiles.Contains(profile.Libelle))
                return BadRequest(
                    "Seuls les profils Secrétaire, Biologiste et Technicien peuvent être attribués depuis l’administration.");
        }

        var identNorm = dto.Identifiant.Trim();
        var allUsers = await uow.Users.ListAsync();
        if (allUsers.Any(u =>
                u.Id != (existingId ?? 0) &&
                string.Equals(u.Identifiant, identNorm, StringComparison.OrdinalIgnoreCase)))
            return Conflict("Cet identifiant est déjà utilisé.");

        return null;
    }

    private async Task<Dictionary<int, string>> ProfileLabelsAsync()
    {
        var profiles = await uow.Profiles.ListAsync();
        return profiles.ToDictionary(p => p.Id, p => p.Libelle);
    }

    private static UserDto Map(User u, IReadOnlyDictionary<int, string> labels) => new()
    {
        Id = u.Id,
        Nom = u.Nom,
        Prenom = u.Prenom,
        Identifiant = u.Identifiant,
        Telephone = u.Telephone,
        ProfileId = u.ProfileId,
        ProfileLibelle = u.ProfileId is { } pid && labels.TryGetValue(pid, out var lib) ? lib : null
    };
}
