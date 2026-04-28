using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace PMA.Api.Services;

public static class ConsentementUploadHelper
{
    public static async Task<string> SaveAsync(IWebHostEnvironment env, int consentId, string suffix, IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";
        if (ext.Length > 10) ext = ".jpg";
        var dir = Path.Combine(env.WebRootPath, "uploads", "consentements");
        Directory.CreateDirectory(dir);
        var fileName = $"{consentId}_{suffix}{ext}";
        var full = Path.Combine(dir, fileName);
        await using var stream = File.Create(full);
        await file.CopyToAsync(stream);
        return $"/uploads/consentements/{fileName}";
    }

    public static void DeleteIfExists(IWebHostEnvironment env, string? relativePath)
    {
        if (string.IsNullOrEmpty(relativePath) || !relativePath.StartsWith("/uploads/consentements/", StringComparison.OrdinalIgnoreCase))
            return;
        var name = Path.GetFileName(relativePath);
        if (string.IsNullOrEmpty(name)) return;
        var full = Path.Combine(env.WebRootPath, "uploads", "consentements", name);
        if (File.Exists(full))
            File.Delete(full);
    }
}
