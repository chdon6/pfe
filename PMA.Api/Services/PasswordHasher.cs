using System.Security.Cryptography;
using System.Text;

namespace PMA.Api.Services;

public static class PasswordHasher
{
    public static string Sha256Hex(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}