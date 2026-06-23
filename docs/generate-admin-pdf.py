"""Generate Admin Guide PDF for Urdu Poetry website."""
from fpdf import FPDF


class GuidePDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 9)
            self.set_text_color(120, 120, 120)
            self.cell(0, 8, "Urdu Poetry - Admin Guide", align="R", new_x="LMARGIN", new_y="NEXT")
            self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def section_title(self, title):
        self.ln(4)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(40, 40, 40)
        self.multi_cell(self.epw, 8, title)
        self.ln(2)

    def sub_title(self, title):
        self.ln(2)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(60, 60, 60)
        self.multi_cell(self.epw, 7, title)
        self.ln(1)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(self.epw, 5.5, text)
        self.ln(1)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(self.epw, 5.5, f"  -  {text}")


def main():
    pdf = GuidePDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(30, 30, 30)
    pdf.multi_cell(pdf.epw, 10, "Urdu Poetry - Admin Guide")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(pdf.epw, 6, "What administrators can do in the system")
    pdf.ln(6)

    pdf.section_title("How someone becomes admin")
    pdf.body_text(
        "Admin access is checked when either the user's profile has user_role = 'admin' "
        "in Supabase, or they log in as admin@urdupoetry.com (hardcoded fallback for local/demo use)."
    )
    pdf.body_text(
        "To set the first real admin in Supabase, run supabase/migrate-user-role.sql "
        "in the Supabase SQL Editor (it can promote a user by email)."
    )

    pdf.section_title("Where admins go")
    pdf.bullet("Route: #/admin (Admin Dashboard)")
    pdf.bullet("Link: Settings > Admin Panel (only shown if the user is an admin)")
    pdf.body_text('Non-admins see "Admin Access Required" on that page.')

    pdf.section_title("What admins can do (Admin Dashboard)")

    pdf.sub_title("1. Manage user roles")
    pdf.bullet("See all registered users (email, name, username)")
    pdf.bullet("Change any user between user and admin")
    pdf.bullet("Changes saved to Supabase via set_user_role")
    pdf.bullet("Rule: An admin cannot remove their own admin role")

    pdf.sub_title("2. Manage writing tags")
    pdf.bullet("Add, edit, and delete scrolling tags in the Write / compose window")
    pdf.bullet("Save Tags writes to Supabase writing_tags (admin-only in database)")

    pdf.sub_title("3. Review reports (moderation)")
    pdf.bullet("See pending reports (posts or users reported by others)")
    pdf.bullet("Approve or Remove each report")
    pdf.bullet("Updates report status in Supabase (admin-only policies on reports)")

    pdf.sub_title("4. Contest overview (read-only)")
    pdf.bullet("View active contests (title, entries, deadline, prize)")
    pdf.bullet("View Submissions links to contests page - no full contest CRUD in admin yet")

    pdf.section_title("Backend powers (API / Supabase) - not all have UI")
    pdf.bullet("Set featured poem (featured_poem table) - No UI, API only (API.setFeaturedPoem)")
    pdf.bullet("Update any user profile - No dedicated UI, DB policy allows admins to update profiles")
    pdf.bullet("View / update all reports - Partial; UI uses local storage; Supabase sync when online")

    pdf.section_title("What admins cannot do (by design)")
    pdf.bullet("End someone else's live mushaira - only the event host can use End Event")
    pdf.bullet("Delete any poem/post globally - no admin delete-content tool in the panel")
    pdf.bullet("Manage voice rooms for others - no admin voice-room controls")
    pdf.bullet("Ban users - only role change (user/admin), no ban or suspend flow")

    pdf.section_title("Admin vs regular user vs mushaira host")
    rows = [
        ("Post poetry, join rooms", "Yes", "Yes", "Yes"),
        ("Create mushaira", "Yes (logged in)", "Yes", "Yes"),
        ("End / delete own mushaira", "Yes (host only)", "Only if creator", "Yes"),
        ("Admin dashboard", "No", "Yes", "If also admin"),
        ("Promote users to admin", "No", "Yes", "No"),
        ("Manage writing tags", "No", "Yes", "No"),
        ("Resolve reports", "No", "Yes", "No"),
    ]
    pdf.set_font("Helvetica", "B", 9)
    col_w = [70, 28, 28, 28]
    headers = ["Action", "Regular user", "Admin", "Mushaira host"]
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 7, h, border=1)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    for row in rows:
        for i, cell in enumerate(row):
            pdf.cell(col_w[i], 6, cell, border=1)
        pdf.ln()

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(
        pdf.epw, 5.5,
        "Summary: Admins run the Admin Dashboard - user roles, writing tags, and report "
        "moderation - plus backend access to featured poem and profile updates. They do not "
        "automatically control live mushairas unless they are also the host.",
    )

    pdf.section_title("Related Supabase files")
    pdf.bullet("supabase/migrate-user-role.sql - user roles and admin policies")
    pdf.bullet("supabase/admin.sql - admin RPC functions")
    pdf.bullet("supabase/schema.sql - full schema including admin RLS policies")

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(pdf.epw, 5, "Urdu Poetry Website | github.com/Zubi71/Poetry | poetry-eta-ten.vercel.app")

    out = __file__.replace("generate-admin-pdf.py", "Admin-Guide-Urdu-Poetry.pdf")
    pdf.output(out)
    print(f"Created: {out}")


if __name__ == "__main__":
    main()
