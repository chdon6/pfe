using System.Diagnostics;

namespace PMA.Pages;

public partial class SwaggerPage : ContentPage
{
    private const string ApiUrl = "http://localhost:5057";
    private const string SwaggerUrl = "http://localhost:5057/swagger";
    private static Process? _apiProcess;
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(3) };

    public SwaggerPage()
    {
        InitializeComponent();
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await EnsureApiRunningAsync();
    }

    private async Task EnsureApiRunningAsync()
    {
        if (await IsApiReady())
        {
            ShowSwagger();
            return;
        }

        StatusLabel.Text = "Demarrage de l'API...";
        StartApiProcess();

        for (int i = 0; i < 30; i++)
        {
            await Task.Delay(1000);
            StatusLabel.Text = $"Demarrage de l'API... ({i + 1}s)";

            if (await IsApiReady())
            {
                ShowSwagger();
                return;
            }
        }

        StatusLabel.Text = "Impossible de demarrer l'API. Verifiez la configuration.";
    }

    private void StartApiProcess()
    {
        if (_apiProcess is { HasExited: false })
            return;

        try
        {
            var apiProjectPath = FindApiProject();
            if (apiProjectPath is null)
            {
                StatusLabel.Text = "Projet PMA.Api introuvable.";
                return;
            }

            _apiProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "dotnet",
                    Arguments = $"run --project \"{apiProjectPath}\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                }
            };
            _apiProcess.Start();
        }
        catch (Exception ex)
        {
            StatusLabel.Text = $"Erreur: {ex.Message}";
        }
    }

    private static string? FindApiProject()
    {
        var baseDir = AppContext.BaseDirectory;
        var dir = new DirectoryInfo(baseDir);

        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "PMA.Api", "PMA.Api.csproj");
            if (File.Exists(candidate))
                return candidate;

            candidate = Path.Combine(dir.FullName, "PMA.Api.csproj");
            if (File.Exists(candidate))
                return candidate;

            dir = dir.Parent;
        }

        var common = @"c:\pfe\PMA.Api\PMA.Api.csproj";
        return File.Exists(common) ? common : null;
    }

    private static async Task<bool> IsApiReady()
    {
        try
        {
            var response = await Http.GetAsync($"{ApiUrl}/swagger/v1/swagger.json");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private void ShowSwagger()
    {
        LoadingPanel.IsVisible = false;
        SwaggerWebView.Source = SwaggerUrl;
        SwaggerWebView.IsVisible = true;
    }
}
