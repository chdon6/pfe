using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Oracle.EntityFrameworkCore;

namespace PMA
{
    public static class MauiProgram
    {
        public static MauiApp CreateMauiApp()
        {
            var builder = MauiApp.CreateBuilder();
            builder
                .UseMauiApp<App>()
                .ConfigureFonts(fonts =>
                {
                    fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                    fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
                });

#if DEBUG
    		builder.Logging.AddDebug();
#endif

            // Injecte EF Core + Oracle si une ConnectionString est fournie.
            // Variables d'environnement possibles:
            // - `ConnectionStrings__PmaContext`
            // - `PMA_CONNECTIONSTRING`
            var connectionString =
                Environment.GetEnvironmentVariable("ConnectionStrings__PmaContext")
                ?? Environment.GetEnvironmentVariable("PMA_CONNECTIONSTRING");

            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                builder.Services.AddDbContext<Entites.PmaDbContext>(options => options.UseOracle(connectionString));
                builder.Services.AddScoped<Interfaces.IUnitOfWork, Repositories.UnitOfWork>();
                builder.Services.AddScoped<Services.IPatientService, Services.PatientService>();
                builder.Services.AddTransient<ViewModels.PatientViewModel>();

                builder.Services.AddScoped<Services.ProfileService>();
                builder.Services.AddScoped<Services.UserService>();
                builder.Services.AddScoped<Services.RendezVousService>();
                builder.Services.AddScoped<Services.ConsentementService>();
                builder.Services.AddScoped<Services.ActePmaService>();
                builder.Services.AddScoped<Services.ElementBiologiqueService>();
                builder.Services.AddScoped<Services.RealisationActeService>();
                builder.Services.AddScoped<Services.ProtocoleService>();
                builder.Services.AddScoped<Services.CyclePmaService>();
                builder.Services.AddScoped<Services.PailleTubeService>();
                builder.Services.AddScoped<Services.CanisterService>();
                builder.Services.AddScoped<Services.BonbonneService>();

                builder.Services.AddTransient<ViewModels.ProfileViewModel>();
                builder.Services.AddTransient<ViewModels.UserViewModel>();
                builder.Services.AddTransient<ViewModels.RendezVousViewModel>();
                builder.Services.AddTransient<ViewModels.ConsentementViewModel>();
                builder.Services.AddTransient<ViewModels.ActePmaViewModel>();
                builder.Services.AddTransient<ViewModels.ElementBiologiqueViewModel>();
                builder.Services.AddTransient<ViewModels.RealisationActeViewModel>();
                builder.Services.AddTransient<ViewModels.ProtocoleViewModel>();
                builder.Services.AddTransient<ViewModels.CyclePmaViewModel>();
                builder.Services.AddTransient<ViewModels.PailleTubeViewModel>();
                builder.Services.AddTransient<ViewModels.CanisterViewModel>();
                builder.Services.AddTransient<ViewModels.BonbonneViewModel>();
            }

            return builder.Build();
        }
    }
}
