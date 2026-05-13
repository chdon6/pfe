using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/chatbot")]
[Authorize(Roles = "Secretaire")]
public class ChatbotController(IHttpClientFactory httpFactory, IConfiguration config) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatbotMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest("Le message est obligatoire.");

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0";

        var section = config.GetSection("PmaChatbot");
        var baseUrl = section["BaseUrl"] ?? "http://127.0.0.1:8000";
        var apiKey = section["ApiKey"] ?? "";

        var client = httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(120);

        var payload = new { user_id = userId, message = request.Message.Trim() };
        var json = JsonSerializer.Serialize(payload, JsonOpts);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/internal/chat")
        {
            Content = content
        };
        httpRequest.Headers.Add("X-Api-Key", apiKey);

        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(httpRequest);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = $"Le service chatbot est injoignable : {ex.Message}" });
        }

        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, new { error = $"Chatbot engine error: {body}" });

        return Content(body, "application/json");
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public async Task<IActionResult> Health()
    {
        var baseUrl = config.GetSection("PmaChatbot")["BaseUrl"] ?? "http://127.0.0.1:8000";
        var client = httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(5);
        try
        {
            var res = await client.GetAsync($"{baseUrl}/health");
            return res.IsSuccessStatusCode
                ? Ok(new { status = "ok" })
                : StatusCode(502, new { status = "engine_error" });
        }
        catch
        {
            return StatusCode(502, new { status = "unreachable" });
        }
    }
}

public class ChatbotMessageRequest
{
    public string Message { get; set; } = "";
}
