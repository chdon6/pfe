using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMA.Api.Migrations
{
    /// <inheritdoc />
    public partial class AjoutGestionCryogenique : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ALERTES_CRYO",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    DATEALERTE = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    TYPE = table.Column<string>(type: "NVARCHAR2(30)", maxLength: 30, nullable: false),
                    SEVERITE = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false),
                    MESSAGE = table.Column<string>(type: "NVARCHAR2(1000)", maxLength: 1000, nullable: false),
                    EQUIPEMENT = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: false),
                    ACQUITTEE = table.Column<int>(type: "NUMBER(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ALERTES_CRYO", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "CAPTEURS_TEMPERATURE",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    NOM = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: false),
                    BONBONNEID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    TEMPERATUREACTUELLE = table.Column<double>(type: "BINARY_DOUBLE", nullable: false),
                    TEMPERATURECIBLE = table.Column<double>(type: "BINARY_DOUBLE", nullable: false),
                    SEUILALERTE = table.Column<double>(type: "BINARY_DOUBLE", nullable: false),
                    STATUT = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false),
                    DERNIEREMAJ = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CAPTEURS_TEMPERATURE", x => x.ID);
                    table.ForeignKey(
                        name: "FK_CAPTEURS_TEMPERATURE_BONBONNES_BONBONNEID",
                        column: x => x.BONBONNEID,
                        principalTable: "BONBONNES",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MAINTENANCES_PREVENTIVES",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    EQUIPEMENT = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: false),
                    TYPEEQUIPEMENT = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false),
                    TYPEMAINTENANCE = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: false),
                    DERNIEREEXECUTION = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    PROCHAINEEXECUTION = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    FREQUENCEJOURS = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    RESPONSABLE = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: false),
                    STATUT = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false),
                    NOTES = table.Column<string>(type: "NVARCHAR2(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MAINTENANCES_PREVENTIVES", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "NIVEAUX_AZOTE",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    BONBONNEID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    NIVEAUPOURCENTAGE = table.Column<double>(type: "BINARY_DOUBLE", nullable: false),
                    VOLUMELITRES = table.Column<double>(type: "BINARY_DOUBLE", nullable: false),
                    CAPACITELITRES = table.Column<double>(type: "BINARY_DOUBLE", nullable: false),
                    SEUILALERTE = table.Column<double>(type: "BINARY_DOUBLE", nullable: false),
                    DERNIERREMPLISSAGE = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    PROCHAINREMPLISSAGE = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    STATUT = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NIVEAUX_AZOTE", x => x.ID);
                    table.ForeignKey(
                        name: "FK_NIVEAUX_AZOTE_BONBONNES_BONBONNEID",
                        column: x => x.BONBONNEID,
                        principalTable: "BONBONNES",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HISTORIQUES_TEMPERATURE",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    CAPTEURTEMPERATUREID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    VALEUR = table.Column<double>(type: "BINARY_DOUBLE", nullable: false),
                    DATEMESURE = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HISTORIQUES_TEMPERATURE", x => x.ID);
                    table.ForeignKey(
                        name: "FK_HISTORIQUES_TEMPERATURE_CAPTEURS_TEMPERATURE_CAPTEURTEMPERATUREID",
                        column: x => x.CAPTEURTEMPERATUREID,
                        principalTable: "CAPTEURS_TEMPERATURE",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CAPTEURS_TEMPERATURE_BONBONNEID",
                table: "CAPTEURS_TEMPERATURE",
                column: "BONBONNEID");

            migrationBuilder.CreateIndex(
                name: "IX_HISTORIQUES_TEMPERATURE_CAPTEURTEMPERATUREID",
                table: "HISTORIQUES_TEMPERATURE",
                column: "CAPTEURTEMPERATUREID");

            migrationBuilder.CreateIndex(
                name: "IX_NIVEAUX_AZOTE_BONBONNEID",
                table: "NIVEAUX_AZOTE",
                column: "BONBONNEID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ALERTES_CRYO");

            migrationBuilder.DropTable(
                name: "HISTORIQUES_TEMPERATURE");

            migrationBuilder.DropTable(
                name: "MAINTENANCES_PREVENTIVES");

            migrationBuilder.DropTable(
                name: "NIVEAUX_AZOTE");

            migrationBuilder.DropTable(
                name: "CAPTEURS_TEMPERATURE");

            migrationBuilder.RenameColumn(
                name: "COULEUR",
                table: "BONBONNES",
                newName: "Couleur");

            migrationBuilder.RenameColumn(
                name: "CODE",
                table: "BONBONNES",
                newName: "Code");

            migrationBuilder.AlterColumn<string>(
                name: "Couleur",
                table: "BONBONNES",
                type: "NVARCHAR2(2000)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "NVARCHAR2(30)",
                oldMaxLength: 30);

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "BONBONNES",
                type: "NVARCHAR2(2000)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "NVARCHAR2(50)",
                oldMaxLength: 50);
        }
    }
}
