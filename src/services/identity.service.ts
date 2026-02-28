import { and, eq, isNull, or, sql } from "drizzle-orm"
import { db } from "../db"
import { contacts, Contact } from "../db/schema"
import { IdentifyRequest } from "../validators/identify.schema"
import { ConsolidatedContact } from "../types"

/**
 *
 * @param request: IdentifyRequest
 * @returns user
 * Method used to handle all the logic for identification of the customer
 */
export async function identifyContact(
  request: IdentifyRequest,
): Promise<ConsolidatedContact> {
  const { email, phoneNumber } = request

  return await db.transaction(async (tx) => {
    // Find all contacts matching email OR phone
    const conditions = []
    if (email) conditions.push(eq(contacts.email, email))
    if (phoneNumber) conditions.push(eq(contacts.phoneNumber, phoneNumber))

    const matchedContacts = await tx
      .select()
      .from(contacts)
      .where(and(isNull(contacts.deletedAt), or(...conditions)))

    // If No matches then create new primary contact
    if (matchedContacts.length === 0) {
      const [newContact] = await tx
        .insert(contacts)
        .values({
          email,
          phoneNumber,
          linkPrecedence: "primary",
          linkedId: null,
        })
        .returning()

      return buildResponse([newContact])
    }

    // Fetch all primaries (roots) for matched contacts
    const primaryIds = new Set<number>()

    for (const c of matchedContacts) {
      if (c.linkPrecedence === "primary") {
        primaryIds.add(c.id)
      } else if (c.linkedId !== null) {
        primaryIds.add(c.linkedId)
      }
    }

    // Fetch all primary contacts
    const primaryContacts = await tx
      .select()
      .from(contacts)
      .where(
        and(
          isNull(contacts.deletedAt),
          sql`${contacts.id} = ANY(ARRAY[${sql.join(
            Array.from(primaryIds).map((id) => sql`${id}`),
            sql`, `,
          )}]::int[])`,
        ),
      )

    // Determine THE oldest primary (true root)
    const sortedPrimaries = primaryContacts.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )
    const truePrimary = sortedPrimaries[0]
    const secondaryPrimaries = sortedPrimaries.slice(1)

    // Demote other primaries to secondary
    if (secondaryPrimaries.length > 0) {
      const idsToUpdate = secondaryPrimaries.map((c) => c.id)
      await tx
        .update(contacts)
        .set({
          linkPrecedence: "secondary",
          linkedId: truePrimary.id,
          updatedAt: new Date(),
        })
        .where(
          sql`${contacts.id} = ANY(ARRAY[${sql.join(
            idsToUpdate.map((id) => sql`${id}`),
            sql`, `,
          )}]::int[])`,
        )

      // re-link all secondaries that were linked to the demoted primaries
      await tx
        .update(contacts)
        .set({
          linkedId: truePrimary.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            isNull(contacts.deletedAt),
            sql`${contacts.linkedId} = ANY(ARRAY[${sql.join(
              idsToUpdate.map((id) => sql`${id}`),
              sql`, `,
            )}]::int[])`,
          ),
        )
    }

    // Fetch full cluster under truePrimary
    const allInCluster = await tx
      .select()
      .from(contacts)
      .where(
        and(
          isNull(contacts.deletedAt),
          or(
            eq(contacts.id, truePrimary.id),
            eq(contacts.linkedId, truePrimary.id),
          ),
        ),
      )

    // Check if incoming request has new info → create secondary
    const existingEmails = new Set(
      allInCluster.map((c) => c.email).filter(Boolean),
    )
    const existingPhones = new Set(
      allInCluster.map((c) => c.phoneNumber).filter(Boolean),
    )

    const hasNewEmail = email && !existingEmails.has(email)
    const hasNewPhone = phoneNumber && !existingPhones.has(phoneNumber)

    if (hasNewEmail || hasNewPhone) {
      const [newSecondary] = await tx
        .insert(contacts)
        .values({
          email,
          phoneNumber,
          linkedId: truePrimary.id,
          linkPrecedence: "secondary",
        })
        .returning()

      allInCluster.push(newSecondary)
    }

    return buildResponse(allInCluster, truePrimary.id)
  })
}

/**
 * function to create proper formatted json response
 */
function buildResponse(
  cluster: Contact[],
  primaryId?: number,
): ConsolidatedContact {
  const primary = primaryId
    ? cluster.find((c) => c.id === primaryId)!
    : cluster[0]

  const secondaries = cluster.filter((c) => c.id !== primary.id)

  const emails: string[] = []
  const phoneNumbers: string[] = []
  const seen = { emails: new Set<string>(), phones: new Set<string>() }

  const addEmail = (e: string | null) => {
    if (e && !seen.emails.has(e)) {
      seen.emails.add(e)
      emails.push(e)
    }
  }
  const addPhone = (p: string | null) => {
    if (p && !seen.phones.has(p)) {
      seen.phones.add(p)
      phoneNumbers.push(p)
    }
  }

  addEmail(primary.email)
  addPhone(primary.phoneNumber)

  for (const c of secondaries) {
    addEmail(c.email)
    addPhone(c.phoneNumber)
  }

  return {
    primaryContatctId: primary.id,
    emails,
    phoneNumbers,
    secondaryContactIds: secondaries.map((c) => c.id),
  }
}
