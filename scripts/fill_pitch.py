"""Fill GEH_Pitch_Template.pptx with OneDoor content, keeping the template's layout and styling.

    python scripts/fill_pitch.py <template.pptx> deliverables/OneDoor_Pitch.pptx
"""
import sys
from pptx import Presentation
from pptx.util import Emu

# slide number -> shape_id -> list of paragraph texts (None keeps a paragraph as-is)
CONTENT = {
    1: {
        3: ["Team OneDoor"],
        4: ["OneDoor: a 5-minute check, by web or text in 7 languages, that gets eligible NYC households their Con Edison discount — even when the bill is in someone else's name"],
        6: [None, "11 · Unclaimed energy assistance in NYC"],
        8: [None, "Policy, Systems & Community-Based Solutions"],
        10: [None, "Arushi Nirmal (solo): product, data & policy"],
    },
    2: {
        5: ["Half a million NYC homes miss a discount"],
        10: [
            "Low-income renters, older adults and families in the Bronx, Harlem and Flushing. ≈989,000 NYC households qualify; ≈521,700 are not enrolled (our ACS 2024 model). 496,007 customers owe $948M in arrears; 190,410 shutoffs in 2025.",
            "“Her mother receives SSI, but the Utility account is in Rosa's name, so no agency ever flagged the household.” — Brief 11",
        ],
        13: ["100,000"],
        14: ["more households enrolled in year 1 (≈20% of the gap)"],
        17: ["60% → 90%"],
        18: ["still enrolled after 18 months: paper re-application vs. renewal by data match"],
        21: ["$50.4M"],
        22: ["in discounts delivered per year, and ≈1,575 shutoffs avoided"],
    },
    3: {
        5: ["Match homes, not names, to enroll them"],
        8: ["Two programs, two doors. Only HEAP, TANF and Safety Net auto-enroll, matched to the account holder's name. Medicaid, SNAP, SSI and NYCHA households must apply."],
        11: ["One 5-minute screener that counts everyone in the home, routes to the right program, and records consent to match the service address against benefit records."],
        16: ["#5: the bill holder is not the benefit recipient. Also #1 two doors and #3 renewal paperwork."],
        20: ["Screen in 5 minutes on the web, or 8 SMS replies"],
        24: ["Household Link: anyone's benefit in the home counts"],
        28: ["Consent-to-match: the state enrolls & renews by address"],
    },
    4: {
        5: ["Free for families, $1.68/mo for others"],
        8: ["$0"],
        9: ["Households pay nothing and save $33–$190 a month (Con Edison tiers, Feb 2026)"],
        11: ["7% offset"],
        16: ["Discounts: all ratepayers through rates, as today. OneDoor (~$15 per enrollee): utility EAP admin or city outreach budget."],
        21: ["Fewer write-offs, collections and shutoffs: $3.4M/yr at 100k enrollees. Renewal by data cuts paperwork cost."],
        26: ["A DPS-designated matching hub and the utility's EAP team; CBOs and libraries run outreach."],
        31: ["Enrolled homes can be routed to free efficiency and heat-pump upgrades (EmPower+), cutting use and emissions."],
    },
    5: {
        5: ["Working today on real NYC data"],
        10: [
            "Tested: 39 unit + e2e tests; real ACS & DPS data",
            "Fits: PSC Case 14-M-0565 + HEAP data flows",
            "Risk: data-sharing approval → start with consent",
        ],
        14: ["Bronx CDs 1–9 with CBOs & libraries: 5,000 homes"],
        18: ["All 5 boroughs, then National Grid & NY utilities"],
        22: ["Any place with a registry + address key (UK, Brazil)"],
        27: ["A pilot partner at NY DPS or Con Edison, plus an anonymized address-match test file"],
    },
}


def set_paragraph(par, text):
    runs = par.runs
    if not runs:
        par.add_run().text = text
        return
    runs[0].text = text
    for r in runs[1:]:
        r._r.getparent().remove(r._r)


def notes_from_script(path="deliverables/pitch-video-script.md"):
    """Slide N's speaker notes = the quoted lines under '## Slide N' in the pitch script."""
    notes, cur = {}, None
    for line in open(path, encoding="utf-8"):
        if line.startswith("## Slide "):
            cur = int(line.split()[2])
            notes[cur] = []
        elif cur and line.startswith("> "):
            notes[cur].append(line[2:].strip())
    return {k: "\n\n".join(v) for k, v in notes.items()}


def main(src, out):
    prs = Presentation(src)
    notes = notes_from_script()
    for idx, slide in enumerate(prs.slides, 1):
        shapes = {sh.shape_id: sh for sh in slide.shapes}
        for sid, texts in CONTENT.get(idx, {}).items():
            paras = [p for p in shapes[sid].text_frame.paragraphs if "".join(r.text for r in p.runs).strip()]
            assert len(paras) == len(texts), (idx, sid, len(paras), len(texts))
            for par, text in zip(paras, texts):
                if text is not None:
                    set_paragraph(par, text)
        if idx in notes:
            slide.notes_slide.notes_text_frame.text = notes[idx]
        if idx == 5:
            frame = next(sh for sh in slide.shapes if sh.name == "Prototype image placeholder")
            for sh in list(slide.shapes):
                if sh.name == "Placeholder icon" or (sh.has_text_frame and sh.text_frame.text.startswith("[Screenshot")):
                    sh._element.getparent().remove(sh._element)
            pad = Emu(45720)
            w, h = frame.width - 2 * pad, frame.height - 2 * pad
            pic = slide.shapes.add_picture("deliverables/screenshot-rosa-result.png", frame.left + pad, frame.top + pad, width=w)
            # Crop to the frame's aspect ratio (keep the top of the screenshot).
            if pic.height > h:
                pic.crop_bottom = 1 - h / pic.height
                pic.height = h
            pic.name = "OneDoor screenshot"
            pic._element.nvPicPr.cNvPr.set("descr", "OneDoor result for Rosa's household: EAP, Household Link match, $33.47/month")
    prs.save(out)
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
