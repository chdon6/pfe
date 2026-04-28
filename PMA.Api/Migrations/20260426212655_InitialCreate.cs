using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMA.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BONBONNES",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    Code = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    Couleur = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    TYPESTOCKAGE = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    TEMPERATURE = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BONBONNES", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "PATIENTS",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    NOM = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: false),
                    PRENOM = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: false),
                    DATENAISSANCE = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    FEMMENOM = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: true),
                    FEMMEPRENOM = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: true),
                    FEMMEDATENAISSANCE = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true),
                    NUMDOSSIER = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false),
                    TYPEDOSSIER = table.Column<string>(type: "NVARCHAR2(30)", maxLength: 30, nullable: false),
                    TYPEACTEPMA = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: true),
                    ADRESSE = table.Column<string>(type: "NVARCHAR2(500)", maxLength: 500, nullable: true),
                    TELEPHONE = table.Column<string>(type: "NVARCHAR2(30)", maxLength: 30, nullable: true),
                    IMAGEPATH = table.Column<string>(type: "NVARCHAR2(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PATIENTS", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "PROFILES",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    LIBELLE = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PROFILES", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "PROTOCOLS",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    TYPE = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PROTOCOLS", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "CANISTERS",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    NUMERO = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    BONBONNEID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CANISTERS", x => x.ID);
                    table.ForeignKey(
                        name: "FK_CANISTERS_BONBONNES_BONBONNEID",
                        column: x => x.BONBONNEID,
                        principalTable: "BONBONNES",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ACTES_PMA",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    TYPEACTE = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false),
                    LIBELLE = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: false),
                    OBSERVATION = table.Column<string>(type: "NVARCHAR2(2000)", maxLength: 2000, nullable: true),
                    STATUTREALISATION = table.Column<string>(type: "NVARCHAR2(30)", maxLength: 30, nullable: false),
                    PATIENTID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ACTES_PMA", x => x.ID);
                    table.ForeignKey(
                        name: "FK_ACTES_PMA_PATIENTS_PATIENTID",
                        column: x => x.PATIENTID,
                        principalTable: "PATIENTS",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CONSENTEMENTS",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    TYPE = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    DATESIGNATURE = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    PHOTOPATH = table.Column<string>(type: "NVARCHAR2(500)", maxLength: 500, nullable: true),
                    CINHOMMEPATH = table.Column<string>(type: "NVARCHAR2(500)", maxLength: 500, nullable: true),
                    CINFEMMEPATH = table.Column<string>(type: "NVARCHAR2(500)", maxLength: 500, nullable: true),
                    CONTRATMARIAGEPATH = table.Column<string>(type: "NVARCHAR2(500)", maxLength: 500, nullable: true),
                    PATIENTID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CONSENTEMENTS", x => x.ID);
                    table.ForeignKey(
                        name: "FK_CONSENTEMENTS_PATIENTS_PATIENTID",
                        column: x => x.PATIENTID,
                        principalTable: "PATIENTS",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ELEMENTS_BIOLOGIQUES",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    TYPEELEMENT = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    DATECREATION = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    NUMEROTUBE = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    CodeBarre = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    PATIENTID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ELEMENTS_BIOLOGIQUES", x => x.ID);
                    table.ForeignKey(
                        name: "FK_ELEMENTS_BIOLOGIQUES_PATIENTS_PATIENTID",
                        column: x => x.PATIENTID,
                        principalTable: "PATIENTS",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RENDEZ_VOUS",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    DATEHEURE = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    MOTIF = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    STATUT = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false),
                    PATIENTID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RENDEZ_VOUS", x => x.ID);
                    table.ForeignKey(
                        name: "FK_RENDEZ_VOUS_PATIENTS_PATIENTID",
                        column: x => x.PATIENTID,
                        principalTable: "PATIENTS",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "USERS",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    NOM = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: false),
                    PRENOM = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: false),
                    IDENTIFIANT = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: false),
                    PASSWORDHASH = table.Column<string>(type: "NVARCHAR2(500)", maxLength: 500, nullable: false),
                    TELEPHONE = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false),
                    PROFILEID = table.Column<int>(type: "NUMBER(10)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_USERS", x => x.ID);
                    table.ForeignKey(
                        name: "FK_USERS_PROFILES_PROFILEID",
                        column: x => x.PROFILEID,
                        principalTable: "PROFILES",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CYCLES_PMA",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    PHASE = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    STATUTCYCLE = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false),
                    ETAPECOURANTE = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: false),
                    DATEDEBUT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    DATEFIN = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true),
                    DERNIEREMISEAJOUR = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    ResultatTestGrossesse = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    ResultatTestSignePar = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    ResultatTestSigneLe = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true),
                    PATIENTID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    PROTOCOLEID = table.Column<int>(type: "NUMBER(10)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CYCLES_PMA", x => x.ID);
                    table.ForeignKey(
                        name: "FK_CYCLES_PMA_PATIENTS_PATIENTID",
                        column: x => x.PATIENTID,
                        principalTable: "PATIENTS",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CYCLES_PMA_PROTOCOLS_PROTOCOLEID",
                        column: x => x.PROTOCOLEID,
                        principalTable: "PROTOCOLS",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "REALISATIONS_ACTES",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    DATEREALISATION = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    RESULTAT = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    OBSERVATION = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    STATUT = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    ACTEPMAID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    USERID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_REALISATIONS_ACTES", x => x.ID);
                    table.ForeignKey(
                        name: "FK_REALISATIONS_ACTES_ACTES_PMA_ACTEPMAID",
                        column: x => x.ACTEPMAID,
                        principalTable: "ACTES_PMA",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_REALISATIONS_ACTES_USERS_USERID",
                        column: x => x.USERID,
                        principalTable: "USERS",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CYCLES_ETAPES_HISTORIQUE",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    ETAPE = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: false),
                    STATUT = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false),
                    DATEETAPE = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    OBSERVATION = table.Column<string>(type: "NVARCHAR2(2000)", maxLength: 2000, nullable: true),
                    CYCLEPMAID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    USERID = table.Column<int>(type: "NUMBER(10)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CYCLES_ETAPES_HISTORIQUE", x => x.ID);
                    table.ForeignKey(
                        name: "FK_CYCLES_ETAPES_HISTORIQUE_CYCLES_PMA_CYCLEPMAID",
                        column: x => x.CYCLEPMAID,
                        principalTable: "CYCLES_PMA",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CYCLES_ETAPES_HISTORIQUE_USERS_USERID",
                        column: x => x.USERID,
                        principalTable: "USERS",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PAILLES_TUBES",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    CODEBARRE = table.Column<string>(type: "NVARCHAR2(450)", nullable: false),
                    TYPECONTENU = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    CouleurVisotube = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    CYCLEPMAID = table.Column<int>(type: "NUMBER(10)", nullable: true),
                    PatientId = table.Column<int>(type: "NUMBER(10)", nullable: true),
                    CANISTERID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    POSITION = table.Column<int>(type: "NUMBER(10)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PAILLES_TUBES", x => x.ID);
                    table.ForeignKey(
                        name: "FK_PAILLES_TUBES_CANISTERS_CANISTERID",
                        column: x => x.CANISTERID,
                        principalTable: "CANISTERS",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PAILLES_TUBES_CYCLES_PMA_CYCLEPMAID",
                        column: x => x.CYCLEPMAID,
                        principalTable: "CYCLES_PMA",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PAILLES_TUBES_PATIENTS_PatientId",
                        column: x => x.PatientId,
                        principalTable: "PATIENTS",
                        principalColumn: "ID");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ACTES_PMA_PATIENTID",
                table: "ACTES_PMA",
                column: "PATIENTID");

            migrationBuilder.CreateIndex(
                name: "IX_CANISTERS_BONBONNEID",
                table: "CANISTERS",
                column: "BONBONNEID");

            migrationBuilder.CreateIndex(
                name: "IX_CONSENTEMENTS_PATIENTID",
                table: "CONSENTEMENTS",
                column: "PATIENTID");

            migrationBuilder.CreateIndex(
                name: "IX_CYCLES_ETAPES_HISTORIQUE_CYCLEPMAID",
                table: "CYCLES_ETAPES_HISTORIQUE",
                column: "CYCLEPMAID");

            migrationBuilder.CreateIndex(
                name: "IX_CYCLES_ETAPES_HISTORIQUE_USERID",
                table: "CYCLES_ETAPES_HISTORIQUE",
                column: "USERID");

            migrationBuilder.CreateIndex(
                name: "IX_CYCLES_PMA_PATIENTID",
                table: "CYCLES_PMA",
                column: "PATIENTID");

            migrationBuilder.CreateIndex(
                name: "IX_CYCLES_PMA_PROTOCOLEID",
                table: "CYCLES_PMA",
                column: "PROTOCOLEID");

            migrationBuilder.CreateIndex(
                name: "IX_ELEMENTS_BIOLOGIQUES_PATIENTID",
                table: "ELEMENTS_BIOLOGIQUES",
                column: "PATIENTID");

            migrationBuilder.CreateIndex(
                name: "IX_PAILLES_TUBES_CANISTERID",
                table: "PAILLES_TUBES",
                column: "CANISTERID");

            migrationBuilder.CreateIndex(
                name: "IX_PAILLES_TUBES_CODEBARRE",
                table: "PAILLES_TUBES",
                column: "CODEBARRE",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PAILLES_TUBES_CYCLEPMAID",
                table: "PAILLES_TUBES",
                column: "CYCLEPMAID");

            migrationBuilder.CreateIndex(
                name: "IX_PAILLES_TUBES_PatientId",
                table: "PAILLES_TUBES",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PATIENTS_NUMDOSSIER",
                table: "PATIENTS",
                column: "NUMDOSSIER",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_REALISATIONS_ACTES_ACTEPMAID",
                table: "REALISATIONS_ACTES",
                column: "ACTEPMAID");

            migrationBuilder.CreateIndex(
                name: "IX_REALISATIONS_ACTES_USERID",
                table: "REALISATIONS_ACTES",
                column: "USERID");

            migrationBuilder.CreateIndex(
                name: "IX_RENDEZ_VOUS_PATIENTID",
                table: "RENDEZ_VOUS",
                column: "PATIENTID");

            migrationBuilder.CreateIndex(
                name: "IX_USERS_IDENTIFIANT",
                table: "USERS",
                column: "IDENTIFIANT",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_USERS_PROFILEID",
                table: "USERS",
                column: "PROFILEID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CONSENTEMENTS");

            migrationBuilder.DropTable(
                name: "CYCLES_ETAPES_HISTORIQUE");

            migrationBuilder.DropTable(
                name: "ELEMENTS_BIOLOGIQUES");

            migrationBuilder.DropTable(
                name: "PAILLES_TUBES");

            migrationBuilder.DropTable(
                name: "REALISATIONS_ACTES");

            migrationBuilder.DropTable(
                name: "RENDEZ_VOUS");

            migrationBuilder.DropTable(
                name: "CANISTERS");

            migrationBuilder.DropTable(
                name: "CYCLES_PMA");

            migrationBuilder.DropTable(
                name: "ACTES_PMA");

            migrationBuilder.DropTable(
                name: "USERS");

            migrationBuilder.DropTable(
                name: "BONBONNES");

            migrationBuilder.DropTable(
                name: "PROTOCOLS");

            migrationBuilder.DropTable(
                name: "PATIENTS");

            migrationBuilder.DropTable(
                name: "PROFILES");
        }
    }
}
