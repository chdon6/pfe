using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using PMA.Api.Entites;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using PMA.Api.Interfaces;
using PMA.Api.Models;
using PMA.Api.Services;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IUnitOfWork uow, IConfiguration config) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto body)
    {
        var users = await uow.Users.ListAsync();
        var user = users.FirstOrDefault(x =>
            string.Equals(x.Identifiant, body.Identifiant, StringComparison.OrdinalIgnoreCase));
        if (user is null) return Unauthorized();
        if (user.PasswordHash != PasswordHasher.Sha256Hex(body.Password))
            return Unauthorized();

        Profile? prof = null;
        if (user.ProfileId is { } pid)
            prof = await uow.Profiles.GetByIdAsync(pid);
        var roleName = string.IsNullOrWhiteSpace(prof?.Libelle) ? "Inconnu" : prof!.Libelle;

        var key = Encoding.UTF8.GetBytes(config["Jwt:Key"] ?? "PMA_Development_Secret_Key_Min_32_Chars!!");
        var tokenHandler = new JwtSecurityTokenHandler();
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
 [
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim("identifiant", user.Identifiant),
                new Claim("profileId", user.ProfileId?.ToString() ?? ""),
                new Claim(ClaimTypes.Role, roleName)
            ],
                authenticationType: "JWT"),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return Ok(new LoginResponseDto
        {
            Token = tokenHandler.WriteToken(token),
            User = new UserDto
            {
                Id = user.Id,
                Nom = user.Nom,
                Prenom = user.Prenom,
                Identifiant = user.Identifiant,
                Telephone = user.Telephone,
                ProfileId = user.ProfileId,
                ProfileLibelle = roleName
            }
        });
    }
}