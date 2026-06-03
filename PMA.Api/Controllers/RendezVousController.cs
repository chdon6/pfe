using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers
{
    [ApiController]
    [Route("api/rendezvous")]
    public class RendezVousController : ControllerBase
    {
        private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        private readonly IUnitOfWork _uow;
        private readonly string _disponibilitesFilePath;

        public RendezVousController(IUnitOfWork uow, IWebHostEnvironment env)
        {
            _uow = uow;
            var dir = Path.Combine(env.ContentRootPath, "Data");
            Directory.CreateDirectory(dir);
            _disponibilitesFilePath = Path.Combine(dir, "disponibilites-agenda.json");
        }

        // ─── GET ALL ────────────────────────────────────────────────────────────
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<RendezVousDto>>> GetAll()
        {
            var list = await _uow.RendezVous.ListAsync();
            return Ok(list.Select(Map).ToList());
        }

        // ─── GET BY ID ──────────────────────────────────────────────────────────
        [HttpGet("{id:int}")]
        public async Task<ActionResult<RendezVousDto>> GetById(int id)
        {
            var r = await _uow.RendezVous.GetByIdAsync(id);
            return r is null ? NotFound() : Ok(Map(r));
        }

        // ─── CREATE ─────────────────────────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] RendezVousDto dto)
        {
            if (dto.PatientId <= 0)
                return BadRequest("Patient invalide.");

            var patient = await _uow.Patients.GetByIdAsync(dto.PatientId);
            if (patient is null)
                return BadRequest("Patient introuvable.");

            if (await IsDateNonDisponibleAsync(dto.DateHeure.Date))
                return BadRequest("Ce jour est marqué non disponible. Impossible de planifier un rendez-vous.");

            var e = new RendezVous
            {
                DateHeure = dto.DateHeure,
                Motif = NormalizeMotif(dto.Motif),
                Statut = string.IsNullOrWhiteSpace(dto.Statut) ? "planifie" : dto.Statut.Trim(),
                PatientId = dto.PatientId
            };

            await _uow.RendezVous.AddAsync(e);
            await _uow.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = e.Id }, Map(e));
        }

        // ─── UPDATE ─────────────────────────────────────────────────────────────
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] RendezVousDto dto)
        {
            if (id != dto.Id)
                return BadRequest("L'identifiant de l'URL ne correspond pas au corps de la requête.");

            var e = await _uow.RendezVous.GetByIdAsync(id);
            if (e is null) return NotFound();

            if (await IsDateNonDisponibleAsync(dto.DateHeure.Date))
                return BadRequest("Ce jour est marqué non disponible. Impossible de planifier un rendez-vous.");

            e.DateHeure = dto.DateHeure;
            e.Motif = NormalizeMotif(dto.Motif);
            e.Statut = string.IsNullOrWhiteSpace(dto.Statut) ? "planifie" : dto.Statut.Trim();
            e.PatientId = dto.PatientId;

            await _uow.RendezVous.UpdateAsync(e);
            await _uow.SaveChangesAsync();

            return NoContent();
        }

        // ─── DELETE ─────────────────────────────────────────────────────────────
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var e = await _uow.RendezVous.GetByIdAsync(id);
            if (e is null) return NotFound();

            await _uow.RendezVous.DeleteAsync(e);
            await _uow.SaveChangesAsync();

            return NoContent();
        }

        // ─── MAPPER ─────────────────────────────────────────────────────────────
        private static RendezVousDto Map(RendezVous r) => new()
        {
            Id = r.Id,
            DateHeure = r.DateHeure,
            Motif = r.Motif,
            Statut = r.Statut,
            PatientId = r.PatientId
        };

        /// <summary>Oracle traite '' comme NULL — la colonne MOTIF est NOT NULL.</summary>
        private static string NormalizeMotif(string? motif) =>
            string.IsNullOrWhiteSpace(motif) ? "Consultation PMA" : motif.Trim();

        private async Task<bool> IsDateNonDisponibleAsync(DateTime date)
        {
            if (!System.IO.File.Exists(_disponibilitesFilePath))
                return false;

            await using var stream = System.IO.File.OpenRead(_disponibilitesFilePath);
            var raw = await JsonSerializer.DeserializeAsync<List<DisponibiliteAgendaEntryRaw>>(stream, JsonOpts) ?? [];

            return raw.Any(x =>
            {
                var nonDispo = x.NonDisponible || (x.Confirme.HasValue && !x.Confirme.Value);
                return nonDispo && x.Date.Date == date.Date;
            });
        }

        private sealed class DisponibiliteAgendaEntryRaw
        {
            public DateTime Date { get; set; }
            public bool NonDisponible { get; set; }
            public bool? Confirme { get; set; }
        }
    }

    // ─── DTO ────────────────────────────────────────────────────────────────────
    public class RendezVousDto
    {
        public int Id { get; set; }
        public DateTime DateHeure { get; set; }
        public string Motif { get; set; } = "";
        public string Statut { get; set; } = "planifie";
        public int PatientId { get; set; }
    }
}