using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers
{
    [ApiController]
    [Route("api/rendezvous")]
    public class RendezVousController : ControllerBase
    {
        private readonly IUnitOfWork _uow;

        public RendezVousController(IUnitOfWork uow)
        {
            _uow = uow;
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
            var e = new RendezVous
            {
                DateHeure = dto.DateHeure,
                Motif = dto.Motif ?? "",
                Statut = string.IsNullOrEmpty(dto.Statut) ? "planifie" : dto.Statut,
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

            e.DateHeure = dto.DateHeure;
            e.Motif = dto.Motif ?? "";
            e.Statut = string.IsNullOrEmpty(dto.Statut) ? "planifie" : dto.Statut;
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