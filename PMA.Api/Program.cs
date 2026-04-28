using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PMA.Api.Data;
using PMA.Api.Entites;
using PMA.Api.Interfaces;
using PMA.Api.Repositories;

var builder = WebApplication.CreateBuilder(args);

var conn = builder.Configuration.GetConnectionString("PmaContext") ?? "";
var useInMemory = conn.Equals("InMemory", StringComparison.OrdinalIgnoreCase);

if (useInMemory)
    builder.Services.AddDbContext<PmaDbContext>(o => o.UseInMemoryDatabase("pma_dev"));
else
    builder.Services.AddDbContext<PmaDbContext>(o => o.UseOracle(conn));

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? "PMA_Development_Secret_Key_Min_32_Chars!!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            RoleClaimType = ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "PMA API", Version = "v1" });
    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Collez le token JWT (POST /api/auth/login)"
    };
    c.AddSecurityDefinition("Bearer", scheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [scheme] = Array.Empty<string>()
    });
});

builder.Services.AddCors(o =>
{
    o.AddDefaultPolicy(p => p
        .WithOrigins("http://localhost:4200")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

if (useInMemory)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<PmaDbContext>();
    await db.Database.EnsureCreatedAsync();
    DbSeeder.SeedDevelopmentData(db);
}
else if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<PmaDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbSeed");
    try
    {
        if (await db.Database.CanConnectAsync())
        {
            DbSeeder.SeedDevelopmentData(db);
            logger.LogInformation("Seed développement appliqué (profils + utilisateur admin si absent).");
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Seed développement non appliqué (schéma ou droits).");
    }
}

if (app.Environment.IsDevelopment())
    app.UseDeveloperExceptionPage();

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "PMA API v1"));

app.UseStaticFiles();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger"));

await app.RunAsync();
